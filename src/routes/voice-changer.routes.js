const express = require('express');
const router = express.Router();
const VoiceChangerController = require('../controllers/voice-changer.controller');
const upload = require('../middlewares/upload.middleware');

// GET /api/voice-changer/presets
router.get('/presets', VoiceChangerController.getPresets);

// POST /api/voice-changer/transform
router.post('/transform', upload.single('audio'), VoiceChangerController.transform);

module.exports = router;
