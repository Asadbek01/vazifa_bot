const mongoose = require('mongoose');

// Define the schema for the user model
const topicSchema = new mongoose.Schema({
    topicId: { type: mongoose.Schema.Types.ObjectId, index: true },
    title: {
        type: String,
        required: true
    }
},


{
    timestamps: true // Enable timestamps
});

topicSchema.pre('save', function(next) {
    if (!this.topicId) {
        this.topicId = new mongoose.Types.ObjectId();
    }
    next();
});

const Topics = mongoose.model('Topics', topicSchema);

module.exports = Topics;
