const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    student: String,
    topicTitle: String,
    fileId: String, 
    fileName: String,
    fileId: String,
    groupNumber: Number,
    submittedAt: Date
});

const Submissions = mongoose.model('Submissions', submissionSchema);

module.exports = Submissions;
