const express = require('express');
const router = express.Router();
const TTSController = require('../controllers/tts.controller');

router.get('/voices', TTSController.getVoices);
router.post('/synthesize', TTSController.synthesize);

module.exports = router;
