const mongoose = require('mongoose');

mongoose.connect('mongodb://user:qwqwqw12@ds237588.mlab.com:37588/heroku_vv2hwzh1', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
});