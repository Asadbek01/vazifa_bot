const mongoose = require('mongoose');

// Define the schema for the user model
const userSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    groupNumber: {
        type: Number
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Create the User model based on the schema
const User = mongoose.model('User', userSchema);

module.exports = User;
