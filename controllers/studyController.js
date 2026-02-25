const mongoose = require('mongoose');
const StudySession = require('../models/StudySession');
const ChatSession = require('../models/ChatSession');
const aiService = require('../services/aiService');
const crypto = require('crypto');

// ==================== ORIGINAL STUDY CONTENT (structured modes) ====================

exports.generateStudyContent = async (req, res) => {
    const { mode, topic, level, numQuestions } = req.body;

    if (!mode || !topic || !level) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        const result = await aiService.generateContent(mode, topic, level, numQuestions);

        // Save to DB if connected
        if (mongoose.connection.readyState === 1) {
            await StudySession.create({ mode, topic, level, result });
        }

        res.json({ mode, topic, level, result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Generation failed' });
    }
};

// ==================== CHAT WITH CONTEXT (conversation memory) ====================

exports.chatWithContext = async (req, res) => {
    const { sessionId, message, mode = 'chat', level = 'medium' } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        let session = null;
        let conversationHistory = [];
        const sid = sessionId || crypto.randomUUID();

        // Load existing session from MongoDB
        if (mongoose.connection.readyState === 1) {
            session = await ChatSession.findOne({ sessionId: sid });
            if (session) {
                conversationHistory = session.messages.map(m => ({
                    role: m.role,
                    content: m.content
                }));
            }
        }

        // Generate AI response with full conversation context
        const { response, provider } = await aiService.generateChatResponse(
            message, conversationHistory, mode, level
        );

        // Save to MongoDB
        if (mongoose.connection.readyState === 1) {
            if (!session) {
                // Create new session
                session = new ChatSession({
                    sessionId: sid,
                    title: message.substring(0, 60) + (message.length > 60 ? '...' : ''),
                    messages: []
                });
            }

            // Add user message and AI response
            session.messages.push({
                role: 'user',
                content: message,
                mode,
                level,
                timestamp: new Date()
            });

            session.messages.push({
                role: 'ai',
                content: response,
                mode,
                level,
                timestamp: new Date()
            });

            await session.save();
            console.log(`💾 Session ${sid} saved (${session.messages.length} messages)`);
        }

        res.json({
            sessionId: sid,
            response,
            provider,
            messageCount: conversationHistory.length + 2
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to generate response. Please try again.' });
    }
};

// ==================== CHAT HISTORY ====================

exports.getChatHistory = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json({ sessions: [] });
        }

        const sessions = await ChatSession.find({})
            .select('sessionId title createdAt updatedAt messages')
            .sort({ updatedAt: -1 })
            .limit(50)
            .lean();

        const sessionList = sessions.map(s => ({
            sessionId: s.sessionId,
            title: s.title,
            messageCount: s.messages ? s.messages.length : 0,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            preview: s.messages && s.messages.length > 0
                ? s.messages[s.messages.length - 1].content.substring(0, 80)
                : ''
        }));

        res.json({ sessions: sessionList });
    } catch (error) {
        console.error('History error:', error);
        res.json({ sessions: [] });
    }
};

// ==================== LOAD SPECIFIC SESSION ====================

exports.getSession = async (req, res) => {
    try {
        const { id } = req.params;

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const session = await ChatSession.findOne({ sessionId: id }).lean();

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            sessionId: session.sessionId,
            title: session.title,
            messages: session.messages,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
        });
    } catch (error) {
        console.error('Session load error:', error);
        res.status(500).json({ error: 'Failed to load session' });
    }
};

// ==================== DELETE SESSION ====================

exports.deleteSession = async (req, res) => {
    try {
        const { id } = req.params;

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        await ChatSession.deleteOne({ sessionId: id });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
};