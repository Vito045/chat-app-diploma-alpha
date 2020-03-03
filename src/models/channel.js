const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const channelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    }, 
    description: {
        type: String,
        trim: true,
        default: ' '
    },
    image: {
        type: Buffer
    },
    admin: {
        type: String,
        required: true
    }, 
    isVisible: {
        type: Boolean,
        default: true
    },
    users: [{
        user_id: {
            type: String
        },
        username: {
            type: String
        },
        avatar: {
            type: Buffer
        },
        online: {
            type: Date
        }
    }],
    messages: [{
        user_id: {
            type: String
        },
        username: {
            type: String
        },
        message: {
            type: String,
            trim: true
        },
        date: {
            type: Date
        },
    }]
});

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;