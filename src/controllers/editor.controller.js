const fs = require('fs');
const path = require('path');
const EditorService = require('../services/editor.service');
const config = require('../config/config');
const { convertToMp3 } = require('../utils/audio.util');

class EditorController {
    /**
     * Upload an audio file or recorded voice for editing
     * POST /api/editor/upload
     */
    static async upload(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Please upload or record an audio file.'
                });
            }

            // Automatically convert .webm or raw formats to clean .mp3
            const converted = await convertToMp3(req.file.path);
            const filePath = converted.filePath;
            const filename = converted.filename;
            const duration = await EditorService.getAudioDuration(filePath);
            const audioUrl = `/storage/uploads/${filename}`;

            res.json({
                success: true,
                filename,
                filePath,
                audioUrl,
                duration,
                size: fs.statSync(filePath).size,
                mimetype: 'audio/mpeg'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Process audio with editing/DSP operations
     * POST /api/editor/process
     */
    static async process(req, res, next) {
        try {
            let inputPath = req.body.inputPath;
            const audioUrl = req.body.audioUrl;
            const filename = req.body.filename;

            // Helper to search a filename in outputs or uploads directory (case-insensitive)
            const findFileInDirs = (targetName) => {
                if (!targetName) return null;
                const cleanBase = path.basename(targetName.split('?')[0].split('#')[0]);

                // Direct check
                const outPath = path.join(config.outputsDir, cleanBase);
                if (fs.existsSync(outPath)) return outPath;
                const upPath = path.join(config.uploadsDir, cleanBase);
                if (fs.existsSync(upPath)) return upPath;

                // Case-insensitive search in outputs
                try {
                    const outFiles = fs.readdirSync(config.outputsDir);
                    const matchOut = outFiles.find(f => f.toLowerCase() === cleanBase.toLowerCase());
                    if (matchOut) return path.join(config.outputsDir, matchOut);

                    const upFiles = fs.readdirSync(config.uploadsDir);
                    const matchUp = upFiles.find(f => f.toLowerCase() === cleanBase.toLowerCase());
                    if (matchUp) return path.join(config.uploadsDir, matchUp);
                } catch (e) {}

                return null;
            };

            // If inputPath is not directly provided, resolve from audioUrl or filename
            if (!inputPath && audioUrl) {
                if (audioUrl.startsWith('data:audio') || audioUrl.startsWith('data:application')) {
                    // It's a base64 Data URI! Save to temp file in uploads
                    const base64Data = audioUrl.split(',')[1];
                    if (base64Data) {
                        const tempName = `imported-${Date.now()}-${Math.round(Math.random() * 1e4)}.mp3`;
                        inputPath = path.join(config.uploadsDir, tempName);
                        fs.writeFileSync(inputPath, Buffer.from(base64Data, 'base64'));
                    }
                } else {
                    inputPath = findFileInDirs(audioUrl);
                }
            }

            if (!inputPath && filename) {
                inputPath = findFileInDirs(filename);
            }

            if (!inputPath || !fs.existsSync(inputPath)) {
                return res.status(400).json({
                    success: false,
                    error: 'Source audio file not found. Please upload or import an audio file first.'
                });
            }

            const startTime = req.body.startTime !== undefined && req.body.startTime !== '' ? Number(req.body.startTime) : undefined;
            const endTime = req.body.endTime !== undefined && req.body.endTime !== '' ? Number(req.body.endTime) : undefined;
            const cutMode = req.body.cutMode || 'keep_selection';
            const totalDuration = req.body.totalDuration ? Number(req.body.totalDuration) : undefined;
            const magicMaster = req.body.magicMaster === true || req.body.magicMaster === 'true';
            const auditionMaster = req.body.auditionMaster === true || req.body.auditionMaster === 'true';
            const voiceLeveler = req.body.voiceLeveler === true || req.body.voiceLeveler === 'true';
            const studioTone = req.body.studioTone || 'none';
            const noiseGate = req.body.noiseGate === true || req.body.noiseGate === 'true';
            const pitchShift = req.body.pitchShift !== undefined ? Number(req.body.pitchShift) : 0;
            const speed = req.body.speed !== undefined ? Number(req.body.speed) : 1.0;
            const volume = req.body.volume !== undefined ? Number(req.body.volume) : 1.0;
            const normalize = req.body.normalize === true || req.body.normalize === 'true';
            const limiterEnabled = req.body.limiterEnabled === true || req.body.limiterEnabled === 'true' || auditionMaster || magicMaster;
            const limiterCeiling = req.body.limiterCeiling !== undefined ? Number(req.body.limiterCeiling) : -1.0;
            const compressorRatio = req.body.compressorRatio !== undefined ? Number(req.body.compressorRatio) : 3.5;
            const compressorThreshold = req.body.compressorThreshold !== undefined ? Number(req.body.compressorThreshold) : -18;
            const bass = req.body.bass !== undefined ? Number(req.body.bass) : 0;
            const mid = req.body.mid !== undefined ? Number(req.body.mid) : 0;
            const treble = req.body.treble !== undefined ? Number(req.body.treble) : 0;
            const denoise = req.body.denoise || 'none';
            const fadeIn = req.body.fadeIn !== undefined ? Number(req.body.fadeIn) : 0;
            const fadeOut = req.body.fadeOut !== undefined ? Number(req.body.fadeOut) : 0;
            const reverb = req.body.reverb === true || req.body.reverb === 'true';
            const format = req.body.format || 'mp3';
            const bitrate = req.body.bitrate || '192k';

            const result = await EditorService.processAudio({
                inputPath,
                startTime,
                endTime,
                cutMode,
                totalDuration,
                magicMaster,
                auditionMaster,
                voiceLeveler,
                studioTone,
                noiseGate,
                pitchShift,
                speed,
                volume,
                normalize,
                limiterEnabled,
                limiterCeiling,
                compressorRatio,
                compressorThreshold,
                bass,
                mid,
                treble,
                denoise,
                fadeIn,
                fadeOut,
                reverb,
                format,
                bitrate
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = EditorController;
