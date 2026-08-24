const VoiceChangerService = require('../services/voice-changer.service');

class VoiceChangerController {
    /**
     * Get all available voice changer presets
     * GET /api/voice-changer/presets
     */
    static getPresets(req, res) {
        try {
            const presets = VoiceChangerService.getPresets();
            res.json({
                success: true,
                presets
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Transform voice recording preserving original cadence & rhythm
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
            const preset = req.body.preset || 'female-to-male';
            const pitchShift = req.body.pitchShift !== undefined ? Number(req.body.pitchShift) : undefined;
            const speed = req.body.speed ? Number(req.body.speed) : 1.0;
            const removeNoise = req.body.removeNoise || 'medium';
            const customApiKey = req.body.customApiKey || req.headers['x-gemini-api-key'];

            const result = await VoiceChangerService.transformAudio({
                inputPath,
                preset,
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
