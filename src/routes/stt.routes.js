const express = require('express');
const router = express.Router();
const STTController = require('../controllers/stt.controller');
const upload = require('../middlewares/upload.middleware');

router.post('/transcribe', upload.single('audio'), STTController.transcribe);

module.exports = router;
