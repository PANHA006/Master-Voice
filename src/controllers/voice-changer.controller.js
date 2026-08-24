const VoiceChangerService = require('../services/voice-changer.service');

class VoiceChangerController {
    /**
     * Get all available voice models
     * GET /api/voice-changer/presets or GET /api/voice-changer/voices
     */
    static getPresets(req, res) {
        try {
            const voices = VoiceChangerService.getVoiceModels();
            res.json({
                success: true,
                voices
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Transform voice recording using selected Voice Model
     * POST /api/voice-changer/transform
     */
    static async transform(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Please upload or record an audio file to transform.'
                });
            }

            const inputPath = req.file.path;
            const voice = req.body.voice || req.body.preset || 'km-recap-cinema';
            const pitchShift = req.body.pitchShift !== undefined && req.body.pitchShift !== '' ? Number(req.body.pitchShift) : undefined;
            const speed = req.body.speed ? Number(req.body.speed) : 1.0;
            const removeNoise = req.body.removeNoise || 'medium';
            const customApiKey = req.body.customApiKey || req.headers['x-gemini-api-key'];

            const result = await VoiceChangerService.transformAudio({
                inputPath,
                voice,
                pitchShift,
                speed,
                removeNoise,
                customApiKey
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = VoiceChangerController;
