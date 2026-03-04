const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'ai'], required: true },
    content: { type: String, required: true },
    mode: { type: String, default: 'chat' },
    level: { type: String, default: 'medium' },
    timestamp: { type: Date, default: Date.now }
});

const chatSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: null, index: true },
    messages: [messageSchema],
    title: { type: String, default: 'New Chat' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

chatSessionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
