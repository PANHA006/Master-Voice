const CloneService = require('../services/clone.service');
const { convertToMp3 } = require('../utils/audio.util');

class CloneController {
    /**
     * Phase 1: Process and analyze acoustic frequency profile of voice sample
     * POST /api/clone/process
     */
    static async processVoice(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Please upload or record a reference audio sample to clone.'
                });
            }

            const { voiceName, lang } = req.body;
            const converted = await convertToMp3(req.file.path);

            const result = await CloneService.processVoiceSample({
                referenceAudioPath: converted.filePath,
                voiceName: voiceName || 'My Cloned Voice',
                lang: lang || 'km'
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Phase 2: Test voice synthesis with custom script & acoustic morphing
     * POST /api/clone/test-synthesize
     */
    static async testSynthesize(req, res, next) {
        try {
            const referenceAudioPath = req.file ? req.file.path : req.body.referenceAudioPath;
            if (!referenceAudioPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference voice sample is required for test synthesis.'
                });
            }

            const { text, voiceName, lang } = req.body;

            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Script text is required to test synthesis.'
                });
            }

            const result = await CloneService.cloneAndSynthesize({
                referenceAudioPath,
                text,
                voiceName: voiceName || 'Custom Cloned Voice',
                lang: lang || 'km',
                saveToRegistry: false // Do not save permanently until user clicks Save
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Phase 3: Save tested voice to persistent Voice Models registry
     * POST /api/clone/save-voice
     */
    static async saveVoice(req, res, next) {
        try {
            const { voiceName, lang, referenceAudioPath, acousticData } = req.body;

            if (!referenceAudioPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference audio sample path is required.'
                });
            }

            const result = CloneService.saveVoiceProfile({
                voiceName: voiceName || 'My Cloned Voice',
                lang: lang || 'km',
                referenceAudioPath,
                acousticData
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Backward-compatible direct synthesize
     * POST /api/clone/synthesize
     */
    static async synthesize(req, res, next) {
        try {
            if (!req.file && !req.body.referenceAudioPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Please upload a reference audio sample to clone.'
                });
            }

            const referenceAudioPath = req.file ? req.file.path : req.body.referenceAudioPath;
            const { text, voiceName, lang, saveToRegistry } = req.body;

            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Script text is required.'
                });
            }

            const result = await CloneService.cloneAndSynthesize({
                referenceAudioPath,
                text,
                voiceName: voiceName || 'Custom Cloned Voice',
                lang: lang || 'km',
                saveToRegistry: saveToRegistry === true || saveToRegistry === 'true'
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
