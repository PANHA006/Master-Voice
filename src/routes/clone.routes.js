const express = require('express');
const router = express.Router();
const CloneController = require('../controllers/clone.controller');
const upload = require('../middlewares/upload.middleware');

router.get('/voices', CloneController.getClonedVoices);
router.delete('/voices/clear', CloneController.clearAllClonedVoices);
router.delete('/voices/:id', CloneController.deleteClonedVoice);
router.post('/process', upload.single('referenceAudio'), CloneController.processVoice);
router.post('/test-synthesize', upload.single('referenceAudio'), CloneController.testSynthesize);
router.post('/save-voice', CloneController.saveVoice);
router.post('/synthesize', upload.single('referenceAudio'), CloneController.synthesize);

module.exports = router;
