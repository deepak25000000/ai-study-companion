const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');
const { optionalAuth } = require('../middleware/authMiddleware');

// Original study content generation
router.post('/study', optionalAuth, studyController.generateStudyContent);

// Chat with conversation memory
router.post('/chat', optionalAuth, studyController.chatWithContext);

// Chat history
router.get('/chat/history', optionalAuth, studyController.getChatHistory);

// Load specific session
router.get('/chat/session/:id', studyController.getSession);

// Delete session
router.delete('/chat/session/:id', studyController.deleteSession);

module.exports = router;