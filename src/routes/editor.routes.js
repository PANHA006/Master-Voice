const express = require('express');
const router = express.Router();
const EditorController = require('../controllers/editor.controller');
const upload = require('../middlewares/upload.middleware');

// POST /api/editor/upload - Upload or record audio for editing
router.post('/upload', upload.single('audio'), EditorController.upload);

// POST /api/editor/process - Apply trim/effects/DSP filter chain
router.post('/process', EditorController.process);

module.exports = router;
