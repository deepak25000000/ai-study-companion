const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
    mode: String,
    topic: String,
    level: String,
    result: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudySession', studySessionSchema);