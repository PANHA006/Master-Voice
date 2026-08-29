const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');
const config = require('../config/config');
const { splitScriptLines, formatTime } = require('../utils/timestamp.util');
const { ensureDir } = require('../utils/audio.util');
const VoiceManager = require('../utils/voice-manager.util');
const AcousticAnalyzer = require('../utils/acoustic-analyzer.util');
const googleTTS = require('google-tts-api');

/**
 * Execute Microsoft Edge-TTS with graceful Python fallback
 */
function runEdgeTTS({ text, voice, pitchStr = '+0Hz', rateStr = '-10%', outputPath, vttPath }) {
    return new Promise((resolve, reject) => {
        const args = [
            '--voice', voice,
            `--rate=${rateStr}`,
            `--pitch=${pitchStr}`,
            '--text', text,
            '--write-media', outputPath,
            '--write-subtitles', vttPath
        ];

        execFile('edge-tts', args, { windowsHide: true }, (err, stdout, stderr) => {
            if (!err && fs.existsSync(outputPath)) {
                return resolve();
            }

            const pythonArgs = ['-m', 'edge_tts', ...args];
            execFile('python', pythonArgs, { windowsHide: true }, (pyErr, pyStdout, pyStderr) => {
                if (pyErr || !fs.existsSync(outputPath)) {
                    return reject(new Error(pyStderr || stderr || pyErr?.message || 'Edge-TTS execution failed'));
                }
                resolve();
            });
        });
    });
}

/**
 * Apply dynamic acoustic frequency DSP morphing filter using FFmpeg
 */
function applyAcousticDspFilter(inputAudioPath, outputMorphedPath, filtergraph) {
    return new Promise((resolve, reject) => {
        if (!filtergraph) {
            fs.copyFileSync(inputAudioPath, outputMorphedPath);
            return resolve();
        }

        const args = [
            '-y',
            '-i', inputAudioPath,
            '-af', filtergraph,
            '-c:a', 'libmp3lame',
            '-b:a', '192k',
            outputMorphedPath
        ];

        execFile(ffmpegStatic, args, { windowsHide: true }, (err) => {
            if (err || !fs.existsSync(outputMorphedPath)) {
                console.warn('[!] DSP filter warning, using standard audio:', err?.message);
                try {
                    fs.copyFileSync(inputAudioPath, outputMorphedPath);
                } catch (_) {}
            }
            resolve();
        });
    });
}

/**
 * Parse VTT subtitle blocks into clean line timestamps
 */
function parseVttTimestamps(vttPath, cleanLines, totalDurationFallback) {
    const timestamps = [];
    let currentSeconds = 0;

    if (fs.existsSync(vttPath)) {
        try {
            const vttContent = fs.readFileSync(vttPath, 'utf8');
            const blocks = vttContent.split(/\r?\n\r?\n/).filter(b => b.trim().length > 0);
            const vttItems = [];

            for (const block of blocks) {
                const match = block.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
                if (match) {
                    const startParts = match[1].replace(',', '.').split(':');
                    const sec = parseFloat(startParts[0]) * 3600 + parseFloat(startParts[1]) * 60 + parseFloat(startParts[2]);
                    const textLine = block.substring(block.indexOf(match[0]) + match[0].length).trim();
                    vttItems.push({ seconds: sec, timestamp: formatTime(sec), text: textLine });
                }
            }

            if (vttItems.length > 0) {
                cleanLines.forEach((lineText, idx) => {
                    const matched = vttItems[idx] || vttItems[vttItems.length - 1];
                    const sec = matched ? matched.seconds : idx * 2.5;
                    const timeStr = formatTime(sec);
                    timestamps.push({
                        text: lineText,
                        timestamp: timeStr,
                        seconds: Math.round(sec * 100) / 100,
                        formattedLine: `[${timeStr}] ${lineText}`
                    });
                });
                return timestamps;
            }
        } catch (_) {}
    }

    // Proportional fallback distribution
    const totalDurationSec = totalDurationFallback || 10;
    const totalChars = cleanLines.reduce((sum, l) => sum + Math.max(5, l.length), 0) || 1;

    cleanLines.forEach((lineText, idx) => {
        const timeStr = formatTime(currentSeconds);
        const lineDuration = idx === cleanLines.length - 1
            ? Math.max(1, totalDurationSec - currentSeconds)
            : Math.max(1, totalDurationSec * (Math.max(5, lineText.length) / totalChars));

        timestamps.push({
            timestamp: timeStr,
            text: lineText,
            seconds: Math.round(currentSeconds * 100) / 100,
            formattedLine: `[${timeStr}] ${lineText}`
        });
        currentSeconds += lineDuration;
    });

    return timestamps;
}

class CloneService {
    /**
     * Phase 1: Process and analyze acoustic frequency profile of reference audio sample
     */
    static async processVoiceSample({ referenceAudioPath, voiceName = 'My Cloned Voice', lang = 'km' }) {
        if (!referenceAudioPath || !fs.existsSync(referenceAudioPath)) {
            throw new Error('Reference voice audio sample is required.');
        }

        const samplesDir = path.join(__dirname, '../../storage/uploads/cloned-samples');
        ensureDir(samplesDir);

        const ext = path.extname(referenceAudioPath) || '.webm';
        const sampleFileName = `sample-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        const persistentPath = path.join(samplesDir, sampleFileName);

        fs.copyFileSync(referenceAudioPath, persistentPath);

        // Perform Acoustic Frequency (Hz) & Pitch Analysis
        const acousticData = await AcousticAnalyzer.analyzeVoice(persistentPath, lang);

        return {
            success: true,
            voiceName,
            lang,
            referenceAudioPath: persistentPath,
            acoustic: {
                detectedHz: acousticData.detectedHz,
                minHz: acousticData.minHz,
                maxHz: acousticData.maxHz,
                voiceCategory: acousticData.voiceCategory,
                baseNeuralVoice: acousticData.baseNeuralVoice,
                baseStandardHz: acousticData.baseStandardHz,
                deltaPitchHz: acousticData.deltaPitchHz,
                pitchOffsetStr: acousticData.pitchOffsetStr,
                dspFiltergraph: acousticData.dspFiltergraph,
                spectral: acousticData.spectral
            },
            message: `Acoustic frequency analysis completed (${acousticData.detectedHz} Hz). Voice ready for testing!`
        };
    }

    /**
     * Phase 3: Explicitly save cloned voice profile into persistent registry
     */
    static saveVoiceProfile({ voiceName = 'My Cloned Voice', lang = 'km', referenceAudioPath, acousticData }) {
        if (!referenceAudioPath || !fs.existsSync(referenceAudioPath)) {
            throw new Error('Reference audio file is required to save voice profile.');
        }

        const voiceId = `cloned-${Date.now()}`;
        const saved = VoiceManager.saveClonedVoice({
            id: voiceId,
            name: voiceName,
            lang: lang || 'km',
            referenceAudioPath,
            acoustic: acousticData || null,
            createdAt: new Date().toISOString()
        });

        if (!saved) {
            throw new Error('Failed to save voice profile into registry.');
        }

        return {
            success: true,
            voiceId,
            voiceName,
            lang,
            message: `Voice "${voiceName}" saved to Voice Models successfully!`
        };
    }

    /**
     * Synthesize speech using Acoustic Frequency Matching & Neural Voice Morphing
     */
    static async cloneAndSynthesize({ referenceAudioPath, savedAcoustic, text, voiceName = 'My Cloned Voice', lang = 'km', existingVoiceId, saveToRegistry = false, rate = 1.0 }) {
        const cleanLines = splitScriptLines(text);
        if (cleanLines.length === 0) {
            throw new Error('Script text is empty or invalid.');
        }

        const voiceId = existingVoiceId || `cloned-${Date.now()}`;
        const speedRate = Math.max(0.5, Math.min(3.0, Number(rate) || 1.0));

        // 1. Resolve acoustic properties
        let acousticData = savedAcoustic;

        // Try existing registered voice in VoiceManager
        if (!acousticData && existingVoiceId) {
            const registered = VoiceManager.getClonedVoices().find(v => v.id === existingVoiceId);
            if (registered && registered.acoustic) {
                acousticData = registered.acoustic;
            }
        }

        // If not found and reference sample file exists, analyze it
        if (!acousticData && referenceAudioPath && fs.existsSync(referenceAudioPath)) {
            acousticData = await AcousticAnalyzer.analyzeVoice(referenceAudioPath, lang);
        }

        // If still not found, provide standard acoustic profile fallback
        if (!acousticData) {
            acousticData = {
                baseNeuralVoice: lang === 'km' ? 'km-KH-PisethNeural' : 'en-US-JennyNeural',
                pitchOffsetStr: '+18Hz',
                dspFiltergraph: 'equalizer=f=200:width_type=h:width=100:g=1.5,equalizer=f=2500:width_type=h:width=500:g=1.5,compand=0.3|0.8:6:-70/-60|-20/-10|0/0:6:0:-90:0.2'
            };
        }

        // Save to VoiceManager if explicitly requested
        if (saveToRegistry && !existingVoiceId) {
            VoiceManager.saveClonedVoice({
                id: voiceId,
                name: voiceName,
                lang,
                referenceAudioPath: referenceAudioPath || 'storage/uploads/sample-check.mp3',
                acoustic: acousticData,
                createdAt: new Date().toISOString()
            });
        }

        ensureDir(config.outputsDir);
        const rawFileName = `raw-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp3`;
        const rawOutputPath = path.join(config.outputsDir, rawFileName);
        const vttPath = rawOutputPath.replace(/\.mp3$/, '.vtt');

        const finalFileName = `clone-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp3`;
        const finalOutputPath = path.join(config.outputsDir, finalFileName);

        const fullScript = cleanLines.join('\n');
        let finalAudioBuffer = null;

        // Calculate rate offset matching speedRate (e.g. 1.15x -> +15% - 14% = +1%)
        const rateOffset = lang === 'km' ? -14 : -4;
        const ratePercent = Math.round((speedRate - 1.0) * 100) + rateOffset;
        const rateStr = (ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`);

        // 2. Synthesize using matched Neural Voice base with pitch offset
        try {
            console.log(`[*] Synthesizing voice "${voiceName}" using ${acousticData.baseNeuralVoice} (Offset: ${acousticData.pitchOffsetStr}, Rate: ${rateStr})...`);
            
            await runEdgeTTS({
                text: fullScript,
                voice: acousticData.baseNeuralVoice,
                pitchStr: acousticData.pitchOffsetStr,
                rateStr,
                outputPath: rawOutputPath,
                vttPath
            });

            // 3. Apply Multi-band Formant & Timbre DSP Morphing
            console.log(`[*] Applying Acoustic Frequency & Formant Morphing filter...`);
            await applyAcousticDspFilter(rawOutputPath, finalOutputPath, acousticData.dspFiltergraph);

            if (fs.existsSync(finalOutputPath)) {
                finalAudioBuffer = fs.readFileSync(finalOutputPath);
            }
        } catch (edgeErr) {
            console.warn('[!] Neural Voice synthesis error, falling back to Google TTS:', edgeErr.message);
            
            // Fallback: Google TTS
            const audioBuffers = [];
            const targetLang = lang === 'km' ? 'km' : 'en';

            for (let i = 0; i < cleanLines.length; i++) {
                const lineText = cleanLines[i];
                try {
                    const base64Audio = await googleTTS.getAudioBase64(lineText, {
                        lang: targetLang,
                        slow: false,
                        host: 'https://translate.google.com',
                        timeout: 10000
                    });
                    audioBuffers.push(Buffer.from(base64Audio, 'base64'));
                } catch (_) {}
            }

            if (audioBuffers.length > 0) {
                const combined = Buffer.concat(audioBuffers);
                fs.writeFileSync(rawOutputPath, combined);
                await applyAcousticDspFilter(rawOutputPath, finalOutputPath, acousticData.dspFiltergraph);
                finalAudioBuffer = fs.readFileSync(finalOutputPath);
            }
        } finally {
            // Clean up temporary raw intermediate file
            if (fs.existsSync(rawOutputPath) && fs.existsSync(finalOutputPath)) {
                try { fs.unlinkSync(rawOutputPath); } catch (_) {}
            }
        }

        if (!finalAudioBuffer || finalAudioBuffer.length === 0) {
            throw new Error('Failed to generate audio stream during voice synthesis.');
        }

        // 4. Generate accurate timestamps
        const estDuration = Math.max(2, finalAudioBuffer.length / 6000);
        const timestamps = parseVttTimestamps(vttPath, cleanLines, estDuration);

        // Remove temp VTT file
        if (fs.existsSync(vttPath)) {
            try { fs.unlinkSync(vttPath); } catch (_) {}
        }

        const totalDuration = timestamps.length > 0
            ? Math.round((timestamps[timestamps.length - 1].seconds + 2.0) * 10) / 10
            : Math.round(estDuration * 10) / 10;

        const audioBase64 = finalAudioBuffer.toString('base64');
        const audioDataUri = `data:audio/mp3;base64,${audioBase64}`;

        return {
            success: true,
            voiceId,
            voiceName,
            audioUrl: `/storage/outputs/${finalFileName}`,
            audioDataUri,
            fileName: finalFileName,
            duration: totalDuration,
            lang,
            acoustic: {
                detectedHz: acousticData.detectedHz,
                baseNeuralVoice: acousticData.baseNeuralVoice,
                pitchOffsetStr: acousticData.pitchOffsetStr,
                voiceCategory: acousticData.voiceCategory
            },
            rawLines: timestamps,
            timestamps,
            formattedText: timestamps.map(t => t.formattedLine).join('\n')
        };
    }
}

module.exports = CloneService;
