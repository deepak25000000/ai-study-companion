const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');

// Original study content generation
router.post('/study', studyController.generateStudyContent);

// Chat with conversation memory
router.post('/chat', studyController.chatWithContext);

// Chat history
router.get('/chat/history', studyController.getChatHistory);

// Load specific session
router.get('/chat/session/:id', studyController.getSession);

// Delete session
router.delete('/chat/session/:id', studyController.deleteSession);

module.exports = router;