const CloneService = require('../services/clone.service');

class CloneController {
    /**
     * Synthesize speech using reference voice sample
     * POST /api/clone/synthesize
     */
    static async synthesize(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Please upload a reference audio sample to clone.'
                });
            }

            const { text, voiceName, lang } = req.body;
            const elevenLabsKey = req.body.elevenLabsKey || req.headers['x-elevenlabs-key'];

            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Script text is required.'
                });
            }

            const result = await CloneService.cloneAndSynthesize({
                referenceAudioPath: req.file.path,
                text,
                voiceName: voiceName || 'Custom Cloned Voice',
                lang: lang || 'en',
                elevenLabsKey
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all cloned voice profiles
     * GET /api/clone/voices
     */
    static async getClonedVoices(req, res, next) {
        try {
            const VoiceManager = require('../utils/voice-manager.util');
            const voices = VoiceManager.getClonedVoices();
            return res.json({
                success: true,
                count: voices.length,
                voices
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a single cloned voice profile
     * DELETE /api/clone/voices/:id
     */
    static async deleteClonedVoice(req, res, next) {
        try {
            const VoiceManager = require('../utils/voice-manager.util');
            const { id } = req.params;
            const deleted = VoiceManager.deleteClonedVoice(id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Cloned voice profile not found.' });
            }
            return res.json({ success: true, message: 'Cloned voice profile deleted successfully.' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Clear all cloned voice profiles
     * DELETE /api/clone/voices
     */
    static async clearAllClonedVoices(req, res, next) {
        try {
            const VoiceManager = require('../utils/voice-manager.util');
            VoiceManager.clearAllClonedVoices();
            return res.json({ success: true, message: 'All custom cloned voice profiles cleared successfully.' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = CloneController;
