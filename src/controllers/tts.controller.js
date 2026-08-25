const TTSService = require('../services/tts.service');
const VoiceManager = require('../utils/voice-manager.util');

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

    /**
     * Live Preview Custom Tuned AI Voice Model (TTS + Pitch + Formant + EQ + Dynamics)
     * POST /api/tts/custom-preview
     */
    static async customPreview(req, res, next) {
        try {
            const { text, baseVoice, lang, rate, pitch, formant, bass, mid, treble, compression, reverb } = req.body;

            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Preview text is required'
                });
            }

            const result = await TTSService.synthesizeCustomVoice({
                text,
                baseVoice: baseVoice || 'km-KH-PisethNeural',
                lang: lang || 'km',
                rate: rate ? parseFloat(rate) : 1.0,
                pitch: pitch !== undefined ? parseInt(pitch, 10) : 0,
                formant: formant !== undefined ? parseFloat(formant) : 1.0,
                bass: bass !== undefined ? parseFloat(bass) : 0,
                mid: mid !== undefined ? parseFloat(mid) : 0,
                treble: treble !== undefined ? parseFloat(treble) : 0,
                compression: compression || 'off',
                reverb: reverb || 'off'
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Save Custom Tuned AI Voice Model
     * POST /api/tts/custom-save
     */
    static async customSave(req, res, next) {
        try {
            const { name, baseVoice, lang, pitch, formant, bass, mid, treble, compression, reverb } = req.body;

            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Voice Model Name is required'
                });
            }

            const voiceId = `custom-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
            const newCustomVoice = {
                id: voiceId,
                name: name.trim(),
                gender: 'Custom',
                lang: lang || 'km',
                category: 'Custom',
                isCustom: true,
                createdAt: new Date().toISOString(),
                config: {
                    baseVoice: baseVoice || 'km-KH-PisethNeural',
                    pitch: pitch !== undefined ? parseInt(pitch, 10) : 0,
                    formant: formant !== undefined ? parseFloat(formant) : 1.0,
                    bass: bass !== undefined ? parseFloat(bass) : 0,
                    mid: mid !== undefined ? parseFloat(mid) : 0,
                    treble: treble !== undefined ? parseFloat(treble) : 0,
                    compression: compression || 'off',
                    reverb: reverb || 'off'
                }
            };

            const saved = VoiceManager.saveCustomVoice(newCustomVoice);
            if (saved) {
                res.json({
                    success: true,
                    voice: newCustomVoice,
                    message: 'Custom AI Voice Model saved successfully!'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to save custom voice model.'
                });
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete Custom AI Voice Model
     * DELETE /api/tts/custom-voice/:id
     */
    static async customDelete(req, res, next) {
        try {
            const { id } = req.params;
            const deleted = VoiceManager.deleteCustomVoice(id);
            res.json({
                success: deleted,
                message: deleted ? 'Custom model deleted.' : 'Model not found.'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = TTSController;
