const express = require('express');
const router = express.Router();
const HistoryController = require('../controllers/history.controller');

router.get('/', HistoryController.getHistory);
router.get('/download/:folder/:fileName', HistoryController.downloadFile);
router.delete('/clear', HistoryController.clearAll);
router.delete('/:folder/:fileName', HistoryController.deleteFile);

module.exports = router;
