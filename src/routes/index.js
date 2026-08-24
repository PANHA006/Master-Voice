const express = require('express');
const router = express.Router();
const ttsRoutes = require('./tts.routes');
const sttRoutes = require('./stt.routes');
const cloneRoutes = require('./clone.routes');
const historyRoutes = require('./history.routes');

router.use('/tts', ttsRoutes);
router.use('/stt', sttRoutes);
router.use('/clone', cloneRoutes);
router.use('/history', historyRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'VoxSync AI Server Online',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
