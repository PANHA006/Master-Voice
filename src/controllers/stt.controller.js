const STTService = require('../services/stt.service');
const { safeDeleteFile } = require('../utils/audio.util');

class STTController {
    /**
     * Transcribe audio
     * POST /api/stt/transcribe
     */
    static async transcribe(req, res, next) {
        let uploadedFilePath = null;
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Please upload an audio file to transcribe'
                });
            }

            uploadedFilePath = req.file.path;
            const mimeType = req.file.mimetype;
            const customApiKey = req.body.customApiKey || req.headers['x-gemini-api-key'];

            const result = await STTService.transcribe({
                filePath: uploadedFilePath,
                mimeType,
                customApiKey
            });

            res.json(result);
        } catch (error) {
            next(error);
        } finally {
            // Keep file or delete after processing
            if (uploadedFilePath) {
                // Keep for a short moment or clean up
                // safeDeleteFile(uploadedFilePath);
            }
        }
    }
}

module.exports = STTController;
