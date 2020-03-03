const express = require('express');
require('./db/mongoose');
const path = require('path');
const http  = require('http');
const hbs = require('hbs');
const validator = require('validator');
const soketio = require('socket.io');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');
const User = require('./models/user');
const Channel = require('./models/channel');
const userRouter = require('./routes/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const mongodb = require('mongodb');
const { ObjectID } = mongodb;
// app.use(userRouter);

const port = process.env.PORT;

const app = express();
const server = http.createServer(app);
const io = soketio(server);

//  Define paths for express config
const publicDirectoryPath = path.join(__dirname, '../public');
const viewPath = path.join(__dirname, '../templates/views');
const partialsPath = path.join(__dirname, '../templates/partials');

//  Setup handlebars engine and views location
// app.set('view engine', 'hbs');
// app.set('views', viewPath);
// hbs.registerPartials(partialsPath);

//  Setup sattic directory to serve
app.use(express.static(publicDirectoryPath));

// app.get('/', (req, res) => {
//     res.render('index');
// });

// app.get('/app', (req, res) => {
//     res.render('index');
// });

// app.post('/app', (req, res) => {
//     res.render('index');
// });

io.on('connection', async (socket) => {
    console.log('New WebSocket connection');

    socket.on('authorization', async (token, callback) => {
        if(!token) return socket.emit('start');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token});
        if(!user) {
            socket.emit('start');
            return callback('Something went wrong!');
        }
        user.isOnline = true;
        user.save();
        socket.id = user._id;
        socket.emit('app', { user, token });

        const users = await User.find({});
        users.forEach((u) => u.friends.forEach((friend, i) => {
                if(_.isEqual(new ObjectID(friend.user_id), new ObjectID(user._id))) {
                    friend.isOnline = true
                    io.emit('updateUser', {user_id: u._id, friend, i});
                }
        }));
    });
    // socket.emit('start');
    socket.on('register', async ({ username, email, password }, callback) => {
        // const isEmail = validator.isEmail(email);
        // if(!isEmail) return callback('Email is not valid.');
        socket.emit('loading');
        try {
            const user = new User({username, email, password});
            const token = jwt.sign({ _id: user._id.toString()}, process.env.JWT_SECRET);
            user.tokens = user.tokens.concat({ token });
            user.online = new Date().getTime();
            user.isOnline = true;
            await user.save();
            socket._id = user._id;
            socket.emit('app', { user, token });
        } catch (e) {
            callback('Something went wrong!');
        }
        socket.emit('loading');
    });

    socket.on('login', async ({ email, password }, callback) => {
        socket.emit('loading');
        try {
            const user = await User.findOne({ email });
            console.log(user);
            if(!user) return callback('Unable to login');
            const isMatch = await bcrypt.compare(password, user.password);
            if(!isMatch) return callback('Password is invalid');
            const token = jwt.sign({ _id: user._id.toString()}, process.env.JWT_SECRET);
            user.tokens = user.tokens.concat({ token });
            user.online = new Date().getTime();
            user.isOnline = true;
            await user.save();
            socket._id = user._id;
            socket.emit('app', { user, token});
        } catch (e) {
            callback(e);
        }
        socket.emit('loading');
    });

    socket.on('logout', async (token, callback) => {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token});
        if(!user) callback('Something went wrong!');
        user.tokens = user.tokens.filter((elem) => elem.token !== token);
        await user.save();
    });

    socket.on('createChannel', async ({ name, description, image, isVisible, user }, callback) => {
        try {
            socket.emit('console.log', image.toString());
            const channel = new Channel({ name, description, image, admin: user, isVisible });
            await channel.save();
            socket.emit('joinChannelUser', { user, channel });
            // callback(channel);
        }catch(e) {
            socket.emit('error', e);
        }
    });

    socket.on('joinChannel', async ({ user, name }) => {
        const channel = await Channel.findOne({ name });
        let a = false;
        channel.users.forEach((oneUser) => {
            // console.log(oneUser);
            // console.log(user);
            // console.log(oneUser);
            const u = { user_id: new ObjectID(user._id), username: user.username, online: new Date(user.online) };
            const isEqual = _.isEqual(u, { user_id: new ObjectID(oneUser.user_id), username: oneUser.username, online: oneUser.online });
            if(isEqual) {
                a = true;
                return false;
            }
        });
        if(a) return socket.emit('renderChannel', channel);

        channel.users = channel.users.concat({ user_id: user._id, username: user.username, avatar: user.avatar, online: user.online });
        socket.join(channel.name);
        channel.save();
        socket.emit('renderChannel', channel);
    });

    socket.on('leaveChannel', async ({ user, name }) => {
        const channel = await Channel.findOne({ name });
        channel.users.filter((user) => user !== { user_id: user._id, username: user.username, avatar: user.avatar, online: user.online });
        socket.leave(channel.name);
        channel.save();
        socket.emit('renderMain');
    });

    socket.on('sendMessage', async ({ user, message, name }) => {
        const channel = await Channel.findOne({ name });
        channel.messages = channel.messages.concat({ user_id: user._id, username: user.username, message, date: new Date().getTime(),  online: user.online });
        channel.save();
        socket.broadcast.to(channel.name).emit('renderMessage', { channel });
        socket.emit('renderMyMessage', { channel });
    });

    socket.on('findChannels', async (searchValue) => {
        socket.emit('loading');
        const channels = await Channel.find({});
        const searchResult = channels.filter((channel) => channel.name.toLowerCase().includes(searchValue.toLowerCase()));
        // console.log(searchResult);
        socket.emit('renderChannels', {channels: searchResult});
        socket.emit('loading');
    });

    socket.on('findUsers', async ({ user: currentUser, searchValue }) => {
        const users = await User.find({});
        let results = [];
        users.forEach((user) => {
            if(_.isEqual(user._id, new ObjectID(currentUser._id))) return false;
            const u = { username: user.username, avatar: user.avatar };
            results.push(u);
        });
        const searchResult = results.filter((user) => {
            // buffers.push(user.avatar);
            // const u = {username: user.username, avatar: user.avatar}
            // console.log(user.user_id, currentUser._id);
            // if(user.user_id === new ObjectID(currentUser._id)) return false;
            return user.username.toLowerCase().includes(searchValue.toLowerCase())
        });
        socket.emit('renderUsers', {users: searchResult});
    });

    socket.on('addRemoveFriend', async ({ user, userName }) => {
        const findFriend = await User.findOne({ username: userName });
        const currentUser = await User.findOne({ _id: user._id });
        // console.log(currentUser);
        // console.log(currentUser, findFriend);
        if(!findFriend) return socket.emit('error', 'Something went wrong!');
        // console.log(1);
        // console.log(currentUser);
        const result = currentUser.friends.filter((friend) => {
            // console.log({ user_id: new ObjectID(friend.user_id), username: friend.username }, { user_id: findFriend._id, username: findFriend.username });
            const test = _.isEqual({ user_id: new ObjectID(friend.user_id), username: friend.username, isOnline: friend.isOnline }, { user_id: findFriend._id, username: findFriend.username, isOnline: findFriend.isOnline });
            // console.log(test);
            // console.log(test);
            if(test) return false;
            // else user.friends.concat({ user_id: findFriend._id, username: findFriend.username });
            return true;
        });
        // console.log(currentUser, user);
        // console.log(result);
        // console.log(result);
        // console.log(result);
        if(result.length < user.friends.length) currentUser.friends = result;
        else if (result.length === user.friends.length) currentUser.friends =  user.friends.concat({ user_id: findFriend._id, username: findFriend.username, isOnline: findFriend.isOnline });
        // console.log(user);
        // console.log(user);
        currentUser.save();
        socket.emit('addRemoveFriendData', {data: currentUser, friendsName: findFriend.username});
        // console.log(user);
    });

    socket.on('updateUserData', async ({data}) => {
        const user = await User.findById(data._id);
        // console.log(data);
        user.friends = data.friends;
        await user.save();
    });

    socket.on('addFavourites', async ({ user_id, channelName }) => {
        // console.log( user_id, channelName);
        const user = await User.findById(user_id);
        // console.log(user);
        if(!user) return socket.emit('errro', 'Some thing went wrond!');
        const channel = await Channel.findOne({ name: channelName });
        if(!channel) return socket.emit('errro', 'Some thing went wrond!');

        const result = user.favourites.filter((favourite) => {
            // console.log(favourite.channel_id, channel._id);
            const test = _.isEqual(new ObjectID(favourite.channel_id), new ObjectID(channel._id));
            // console.log(test);
            if(test) return false;
            return true;
        });

        if(result.length < user.favourites.length) user.favourites = result;
        else if (result.length === user.favourites.length) user.favourites = user.favourites.concat({ channel_id: channel._id, name: channel.name, description: channel.description, users: channel.users.length, image: channel.image });
        // console.log(user, result);
        user.save();
        // console.log(user);
        socket.emit('renerFavourites', ({ userData: user }));
    });

    socket.on('disconnect', async () => { 
        try {
            const user = await User.findById(socket.id);
            
            user.isOnline = false;
            const users = await User.find({});
            users.forEach((u) => u.friends.forEach((friend, i) => {
                    if(_.isEqual(new ObjectID(friend.user_id), new ObjectID(user._id))) {
                        friend.isOnline = false
                        io.emit('updateUser', {user_id: u._id, friend, i});
                    }
            }));
            // console.log(user);
            const channels = await Channel.find({});

            channels.forEach((channel) => {
                // console.log(channel.users);
                // return !(channel.users.includes({ user_id: user._id, username: user.username }));
                channel.users = channel.users.filter((oneUser) => {
                    // _.unset(oneUser, '_id');
                    // const u = { user_id: new ObjectID(oneUser.user_id), username: oneUser.username};
                    const u = { user_id: new ObjectID(oneUser.user_id), username: oneUser.username};
                    // console.log(u, { user_id: user._id, username: user.username, avatar: user.avatar });
                    const isEqual = _.isEqual(u, { user_id: user._id, username: user.username });
                    // console.log(isEqual);
                    return !isEqual;
                });
                // console.log(channel);
                channel.save();
            });
            user.save();
        } catch (e) {
            
        }
        socket.disconnect(); 
    });

    
    // socket.on('join', ( {username, room }, callback) => {
    //     const { error, user } = addUser({ id: socket.id, username, room});

    //     if(error) return callback(error);

    //     socket.join(user.room);

    //     socket.emit('message', generateMessage('Admin', 'Welcome!'));
    //     socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
    //     io.to(user.room).emit('roomData', {
    //         room: user.room,
    //         users: getUsersInRoom(user.room)
    //     });

    //     callback();
    // });

    // socket.on('sendMessage', (message, callback) => {
    //     const user = getUser(socket.id);
    //     // const filter = new Filter();
    //     // if(filter.isProfane(message)) {
    //     //     return callback('Profenity is not allowed!');
    //     // }
    //     io.to(user.room).emit('message', generateMessage(user.username, message));
    //     callback();
    // });

    // socket.on('sendLocation', (data, callback) => {
    //     const user = getUser(socket.id);
    //     io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${data.latitude},${data.longitude}`));
    //     callback();
    // });

    // socket.on('disconnect', () => {
    //     const user = removeUser(socket.id);
    //     if(user) {
    //         io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`));
    //         io.to(user.room).emit('roomData', {
    //             room: user.room,
    //             users: getUsersInRoom(user.room)
    //         });
    //     }
    // });
});

server.listen(port, () => console.log('Server is up on port', port));

// const express = require('express');
// require('./db/mongoose');
// const path = require('path');
// const http  = require('http');
// const hbs = require('hbs');
// const soketio = require('socket.io');
// const { generateMessage, generateLocationMessage } = require('./utils/messages');
// const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');
// const userRouter = require('./routes/user');
// // app.use(userRouter);

// const port = process.env.PORT;

// const app = express();
// const server = http.createServer(app);
// const io = soketio(server);

// //  Define paths for express config
// const publicDirectoryPath = path.join(__dirname, '../public');
// const viewPath = path.join(__dirname, '../templates/views');
// const partialsPath = path.join(__dirname, '../templates/partials');

// //  Setup handlebars engine and views location
// app.set('view engine', 'hbs');
// app.set('views', viewPath);
// // hbs.registerPartials(partialsPath);

// //  Setup sattic directory to serve
// app.use(express.static(publicDirectoryPath));

// app.get('/', (req, res) => {
//     res.render('login');
// });

// app.get('/app', (req, res) => {
//     res.render('index');
// });

// io.on('connection', (socket) => {
//     console.log('New WebSocket connection');
    
//     // socket.on('join', ( {username, room }, callback) => {
//     //     const { error, user } = addUser({ id: socket.id, username, room});

//     //     if(error) return callback(error);

//     //     socket.join(user.room);

//     //     socket.emit('message', generateMessage('Admin', 'Welcome!'));
//     //     socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
//     //     io.to(user.room).emit('roomData', {
//     //         room: user.room,
//     //         users: getUsersInRoom(user.room)
//     //     });

//     //     callback();
//     // });

//     // socket.on('sendMessage', (message, callback) => {
//     //     const user = getUser(socket.id);
//     //     const filter = new Filter();
//     //     if(filter.isProfane(message)) {
//     //         return callback('Profenity is not allowed!');
//     //     }
//     //     io.to(user.room).emit('message', generateMessage(user.username, message));
//     //     callback();
//     // });

//     // socket.on('sendLocation', (data, callback) => {
//     //     const user = getUser(socket.id);
//     //     io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${data.latitude},${data.longitude}`));
//     //     callback();
//     // });

//     // socket.on('disconnect', () => {
//     //     const user = removeUser(socket.id);
//     //     if(user) {
//     //         io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`));
//     //         io.to(user.room).emit('roomData', {
//     //             room: user.room,
//     //             users: getUsersInRoom(user.room)
//     //         });
//     //     }
//     // });
// });




// app.listen(port, () => console.log('Server is up on port', port)); 