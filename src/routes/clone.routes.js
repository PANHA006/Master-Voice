const express = require('express');
const router = express.Router();
const CloneController = require('../controllers/clone.controller');
const upload = require('../middlewares/upload.middleware');

router.get('/voices', CloneController.getClonedVoices);
router.delete('/voices/clear', CloneController.clearAllClonedVoices);
router.delete('/voices/:id', CloneController.deleteClonedVoice);
router.post('/synthesize', upload.single('referenceAudio'), CloneController.synthesize);

module.exports = router;
