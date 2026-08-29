const express = require('express');
const router = express.Router();
const ttsRoutes = require('./tts.routes');
const sttRoutes = require('./stt.routes');
const cloneRoutes = require('./clone.routes');
const voiceChangerRoutes = require('./voice-changer.routes');
const historyRoutes = require('./history.routes');
const editorRoutes = require('./editor.routes');

router.use('/tts', ttsRoutes);
router.use('/stt', sttRoutes);
router.use('/clone', cloneRoutes);
router.use('/voice-changer', voiceChangerRoutes);
router.use('/history', historyRoutes);
router.use('/editor', editorRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'VoxSync AI Server Online',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
