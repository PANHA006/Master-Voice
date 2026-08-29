const express = require('express');
const router = express.Router();
const TTSController = require('../controllers/tts.controller');

router.get('/voices', TTSController.getVoices);
router.get('/preferences', TTSController.getPreferences);
router.post('/preferences', TTSController.savePreferences);
router.post('/synthesize', TTSController.synthesize);
router.post('/custom-preview', TTSController.customPreview);
router.post('/custom-save', TTSController.customSave);
router.delete('/custom-voice/:id', TTSController.customDelete);

module.exports = router;
