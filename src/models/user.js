const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const something = {
  $binary:
    'iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAMAAABOo35HAAAApVBMVEUAAADf39/Z2dnf39/Pz898fHzf39/U1NTf39/f39/Hx8ff39/f39/f39/f39/f39+AgIDf39/f39/b29vf39/f39+EhISMjIySkpLf39/f39+VlZWqqqqYmJicnJyioqLf39+mpqaampqKioqxsbHf399ubm53d3e7u7uxsbHc3NzX19eTk5Nzc3OFhYXDw8Opqambm5vS0tLLy8twcHCioqKMjIwusobNAAAAJXRSTlMA7A73A/7dFX8zCa1YoWxR/ciGIkOV6tjA1LeVRybRrqiHau9rgAGv3AAADEJJREFUGBnlwQeC00gQBdBSds6enOGXsrN9/6PtzgLLAJNV1S2Z96gO/OmsN5jM7y7GYeh4+M5zwnB8cTefDHqzqU9/vU671+qPHbyDM+63eu0O/ZWmw0k3xIeF3clwSn8Rd9a6cFCBc9GauXT83OF8DBHj+dCl4+W3W2OIGrfaPh0hd9h3oMDpD106Km6v60GN1+25dCQ6w64HZV532KHma88dGOHM29Ro0eAcBp0PImqqdt+DYV6/TQ3k98awYtzzqVncQQhrwoFLzRG1HFjltCJqhmjiwTpvElH9uRMPteBNXKq3TstBbTitDtWXP3BQK87Ap5qanaN2zmdUR9Muaqk7pbrptDzUlNfqUK3MQtRYOKP6iPqouX5ENdFzUHtOj+og6qIRuhFZN3TQEM6Q7HL7aJC+Sxa1QzRK2CZrBh4axhuQHW4XDdR1yYJ2iEYK22Rcz0NDeT0yy5+gwSY+GeReoNEuXDJmeo6GO5+SIW0Hjee0yYihB335MklX/0qT5QYavCEZMICyfLkqAn6iXKzTDcQNSF0LijbLVRHws4J1kkFWi5TNoSLbJun6EPOryiLJIGlOmvw+qsrTYhQEi2K9X6X/Wq3262IR8zvF+w0E9X1S49+hos265IqKJeTc+aSkc4dqslXJAhYJxNx1SIV/h2q2CxayWELKnU8K/DtUk5Qs57CFkDuf5PVRzYplrXPI6JO4OapZs7Q4gYw5CWuhmjUrKDYQ0SJRA1SzZhVxAhEDEjRENSvWss4gYUhi2h4qSVjPYgMBXpuETB1Usi1ZUbyEAGdKItxzVJIHrGqXQsC5SwL8C1RTsLYVBFz4VN0E1SSsbw0BE6qsh2rymA1YQ0CPKmp7qKZgI9aozmtTJW6IapZsyArVhS5V0UVFCzYlRXVdqmCAihI2ZrdEdQP6tLaHikZsTpCjMq9Nn+SGqChhkwpUF7r0OX1UdWCjUlTXp08ZoqoNmxXnqG5InxA5qGrPhq1RnRPRx3VRWcCmbVBdlz6sh8q2bNwaAnr0QZGDylI2bpejOieij+mjuoLNSyGgTx8yg4CYzTtAwow+oBOiui3bkENA2KH3a0FAyjYsIaFF7zb1IGDNNqSQ4E3pvbqQELANe4jo0jvNIGHDVuwhY0bv4p9DQsJWrCHj3Kf3GEDEnq1YQ8iA3qHjQMSBrSggxOnQ21qQUbIVBaS06E2uAxFbtuMAKY5Lb5lARsp2HCBmQm+IPMhYsx0HiPEiet0EQhZsxwJyJvSqyIOMbMd2jCDHi+g1LQjZsiUxBLXoFa4DIQlbUkKQ49LLBpCyZ1sgaUAv8kNIKdiWHIJCn17Sg5iAbdlAUo9eMoaUjK3ZQtKYXtCGmC1bs4SoNj2vDzEJW5NAVJ+eFXkQk7I1KUR5ET1nADl7tmYPWQN6zjnkFGxNAVnn9Iw2BB3YmgWEtelPcwgasTUxhM3pDx0HgmK2J4csp0O/G0JSyfYsIWxIv+tCElu0grAu/cb1IChjiwoI81z6VQ+ScrYogLQe/aoLSTnbtIGwLv3C9SApZ5sSCPNcemoIUTnbtIK0IT3Vh6gN21RAWp+e8B2I2rBNI0hzfPqpDVkbtiqDtDb91IKsDVu1hbQW/TSGrA1blULamP7nQtiGrdpDnEs/DCFsy1aNIG5IP8whbMt2bSBtTj+MISxhu1aQNqbvXEhL2a44gzSXvplB2ootSyBtRt+0IK1gywpIa9E3F5A2YstiSLugbxwIy9m6DMIc+s8U0hK2bgtpU3o0hLQVW7eEtCE9mkBawdYtIW1Cj7qQdmDrlpDWpUchpC3YuiWkhfSvDsQFbN0W4jpE1Ia4gK3LIa5NRD2IC9i2EvJ6RNSCuBHbtoC8FhH1Ie7Atq0hr09EY4hbs20p5I2JyIG4lG3bQp5D5EPeki2LocGnKeRlJdtVQMOUZlBQsF0JNMyoBwUpW1Vm0NCjARTkO7apgIoBTaChYJsSqJjQHBqWbFGcQcWc7qBiwfbsoeOOLqAiYXs20HFBY+hYsC0FlIwphI4l27KEkpBCKCnYjgJaQnKgZFOyFVtocciDlhXbsIYaj6AmW7B5cQ49BD3bko1LoYigKGHTFtBE0JSyYUtoIqhKd2zSAaoIupYlG7SEKoKybcDGLKCLoG0TsCkJdJEHbUs2JM6gyiMH6hZsxh66HAqhrmAzttAVUgh1ezZiBGUhjaFuxUbsoWxMF1C3ZCOWUHZBd1CX79iEHMruaA59BzYggLY5TaAvZQMO0DahAfRlMetbQduAejAgZX1baOvRDAZkC9YWQN2MpjBhW7KyFdRNyYcRCeuKM6jziRwYsWJVCdQ5RDSGGStWtIa+MRH1Ycie1RQZ9PWJqAVT1qxkDxNaRNSDMQfWECcwokdEbRizKVneYQMz2kTUgTl7FreHKR36VwhjlixtDVNCetSFMRkLK3OY0qVHE5gTs6w1jJnQoyHMCVjWCsYM6dEU5ixYVgJjpvQfB8YsWNYSpjj0zQWMWbCsLUy5oG9aMGbEsjYwpUXfzGBMzLJymDKjb1yYkrEwGOPSd2MYsmVZJUwZ0w9zGJKwsAyGzOmHIQxJWdgGhgzpBxeGrFhYAkNc+t8YZqxY1m4FM8b0UwtmrFhYATNa9FMbZqxZWJzBiDb95DswIY9Z2iJdQp/j0xN9GLBcsIYU6vr01BD61qxjBHVDesr1oC1lLTmUeS79ogttC9ayhLIu/aoHZRmrSaGsR79yPejaspo9dHku/aYLXQmrWUNXl343hK6U1Ryga0i/6zhQtWc1I6hyOvSHOVStWU0MVXP6UxuqCtaTQVObnnEOTQvWs4Wic3rOAJpi1pNA0YCeE3nQk7OiPfR4ET2rDz0JK1pAT5+e14aeNWvaQE2bXjCGlrxkTXtoGdNLetCyZlW7LZT06CV+CB0pKwu2UBH69KIBVKxY3W4FDQN6metA3ubAJhy2EOe49IoWpGVpyWbs9jmEteg1kQdZyYjNidMMkryIXjWBpGTBZgVpBjkTel3kQUqWjti8eJ9DiBfRGyaQsdnHbEe53kLEhN7iOhCwLHZs0SHJUJnj0ptaqGqzCti2eL9BRS16W8dBFVlScD0ckgwVOB16hwE+b7mOuT7i/RafNqD38M/xOZtVwHWzSHN8yrlP7zLDJ+TpgmtpVyQZPm5G79TFB2VJseP6ivdbfFCX3mvq4SOW65jrbpHm+ABvSu/WwrttVgE3wq5I8G4ter9OiHfJ0wU3SLDf4l3CDn3ADG/LkmLHTbNIc7xtRh/Sxxu2+5gbqSyWeEOfPiZy8IosHXGDBascr3Ai+qAeXpbG3HBxmuFFPfqwLl6wHPERWGzxgi59XOTgOfmaj8NuleE5TkSfMMQzlgEfjcUGzxjSp/Txh9WOj0ic4A99+hw3xK/yAx+ZFX4TuvRJbQ9PbUd8dIoMT3lt+rQBnljGfIQOOZ4YUAVd/C8p+SiNNvhfl6pwQ3yX7PhIBRt8F7pUSdvDf5IdH61gg/94baqoh0fJjo/XLsjxqEeVTQAsSz5qixzAhKrzL7CN+cgdMlz4JMA9H/HRW5+7JGK64KNXXpGQq4CP3QOJ+RrzcbskQfclH7MzEnW74+N1SsJu+Wid+iTtho/UiU/i/Bs+SicdUuDf8BE66ZCKzg0fnROXlPg3fGROOqTGv+GjctIhTbd8RE590nVb8rE49UnbfcnH4YwM+BrwMbgkI65G3HjlAxky/cINF1+RMe4NN9rJNRnk3+64uU47ZNZ9wE11ScZdfeFGih/IAveGG+jkmuy4j7lpznyy5eoLN0r8QBa5NztujpNrsuvriBuivCTrohtuhJNrqoOvI6698pJqIrrZcb2dXFN9fF1wjcWXVCud25jr6iyiupnecC2dXFEdff3CtRNcUk359yOulfKyQ/Xl3gZcG+XZNdVbdBtzLexOr6n+otuArdudXlMzRLcBW1WeXVNzuLcLtiY+u6Zm8e+/sBWjyw410NVNzKadPlBTRbdf2KDg7Joa7eomYCPK0wdqvs79aczaTi5dOhLR/WnManYnl9d0VNz704AVlKeX13SE/KuzLyVLGp09+HS8ovuzkx1LCE4vr+n4RV/PvgRcQXlydn9Nf5Gr+7MvI/6w+OTs8or+Su7V/dnpSbDjt8Wj07PLh4j+ep2rh/vbs9PTk9EoiEv+blcGwejk9PTs9vLhqkM18A/JYnJOThkcVgAAAABJRU5ErkJggg==',
  $type: '00',
};
const buffer = Buffer.from(something['$binary'], 'base64');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true,
    validate(value) {
      if (!validator.isEmail(value)) throw new Error('Email is invalid.');
    },
  },
  password: {
    type: String,
    required: true,
    trim: true,
    minlength: true,
    validate(value) {
      if (value.toLowerCase().includes('password'))
        throw new Error('Password cannot contain "password"');
    },
  },
  avatar: {
    type: Buffer,
    default: buffer,
  },
  online: {
    type: Date,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  favourites: [
    {
      channel_id: {
        type: String,
      },
      name: {
        type: String,
      },
      description: {
        type: String,
      },
      users: {
        type: Number,
      },
      image: {
        type: Buffer,
      },
    },
  ],
  friends: [
    {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
  ],
  tokens: [
    {
      token: {
        type: String,
        required: true,
      },
    },
  ],
});

userSchema.statics.findByCredits = async (email, password, callback) => {
  const user = await User.findOne({ email });
  if (!user) return callback('Unable to login');
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return callback('Unable to login');
  return user;
};

userSchema.methods.generateAuthToken = async function() {
  const user = this;
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);

  user.tokens = user.tokens.concat({ token });
  await user.save();

  return token;
};

userSchema.methods.toJSON = function() {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.tokens;
  // delete userObject.token;
  delete userObject.avatar;

  return userObject;
};

userSchema.pre('remove', async function(next) {
  const user = this;
  await Task.deleteMany({ owner: user.id });
  next();
});

userSchema.pre('save', async function(next) {
  const user = this;

  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }

  next();
});

userSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'friends'
    });

    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
