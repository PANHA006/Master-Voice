const TTSService = require('../services/tts.service');

class TTSController {
    /**
     * Get available voices
     * GET /api/tts/voices
     */
    static async getVoices(req, res, next) {
        try {
            const voices = TTSService.getAvailableVoices();
            res.json({
                success: true,
                voices
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Synthesize speech
     * POST /api/tts/synthesize
     */
    static async synthesize(req, res, next) {
        try {
            const { text, voice, lang, rate, pitch, azureKey, azureRegion } = req.body;
            const customAzureKey = azureKey || req.headers['x-azure-key'];
            const customAzureRegion = azureRegion || req.headers['x-azure-region'];

            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Script text is required'
                });
            }

            const result = await TTSService.synthesize({
                text,
                voice,
                lang: lang || 'en',
                rate: rate ? parseFloat(rate) : 1.0,
                pitch: pitch ? parseInt(pitch, 10) : 0,
                azureKey: customAzureKey,
                azureRegion: customAzureRegion
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = TTSController;
