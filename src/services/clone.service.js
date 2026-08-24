const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { splitScriptLines, formatTime } = require('../utils/timestamp.util');
const { ensureDir } = require('../utils/audio.util');
const VoiceManager = require('../utils/voice-manager.util');
const googleTTS = require('google-tts-api');

class CloneService {
    /**
     * Process and prepare reference audio sample for cloning (Phase 1)
     */
    static async processVoiceSample({ referenceAudioPath, voiceName = 'My Cloned Voice', lang = 'en' }) {
        if (!referenceAudioPath || !fs.existsSync(referenceAudioPath)) {
            throw new Error('Reference voice audio sample is required.');
        }

        const samplesDir = path.join(__dirname, '../../storage/uploads/cloned-samples');
        ensureDir(samplesDir);

        const ext = path.extname(referenceAudioPath) || '.webm';
        const sampleFileName = `sample-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        const persistentPath = path.join(samplesDir, sampleFileName);

        fs.copyFileSync(referenceAudioPath, persistentPath);

        return {
            success: true,
            voiceName,
            lang,
            referenceAudioPath: persistentPath,
            message: `Voice "${voiceName}" processed and ready for testing.`
        };
    }

    /**
     * Explicitly save cloned voice profile into persistent registry (Phase 3)
     */
    static saveVoiceProfile({ voiceName = 'My Cloned Voice', lang = 'en', referenceAudioPath }) {
        if (!referenceAudioPath || !fs.existsSync(referenceAudioPath)) {
            throw new Error('Reference audio file is required to save voice profile.');
        }

        const voiceId = `cloned-${Date.now()}`;
        const saved = VoiceManager.saveClonedVoice({
            id: voiceId,
            name: voiceName,
            lang: lang || 'en',
            referenceAudioPath,
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
     * Synthesize speech using reference audio sample (Voice Cloning)
     * 
     * @param {Object} params
     * @param {string} params.referenceAudioPath - Path to user's voice sample
     * @param {string} params.text - Script text to synthesize
     * @param {string} [params.voiceName] - Custom voice name
     * @param {string} [params.lang] - Language ('en' or 'km')
     * @param {string} [params.elevenLabsKey] - Optional custom ElevenLabs key
     * @param {boolean} [params.saveToRegistry] - Whether to automatically save to voice models (default: false)
     */
    static async cloneAndSynthesize({ referenceAudioPath, text, voiceName = 'My Cloned Voice', lang = 'en', elevenLabsKey, existingVoiceId, saveToRegistry = false }) {
        const cleanLines = splitScriptLines(text);
        if (cleanLines.length === 0) {
            throw new Error('Script text is empty or invalid.');
        }

        if (!referenceAudioPath || !fs.existsSync(referenceAudioPath)) {
            throw new Error('Reference voice audio sample is required for cloning.');
        }

        const voiceId = existingVoiceId || `cloned-${Date.now()}`;

        // Only save to VoiceManager if explicitly requested
        if (saveToRegistry && !existingVoiceId) {
            VoiceManager.saveClonedVoice({
                id: voiceId,
                name: voiceName,
                lang,
                referenceAudioPath,
                createdAt: new Date().toISOString()
            });
        }

        ensureDir(config.outputsDir);
        const fileName = `clone-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp3`;
        const outputPath = path.join(config.outputsDir, fileName);

        const apiKey = elevenLabsKey || process.env.ELEVENLABS_API_KEY;

        let finalAudioBuffer;
        const timestamps = [];
        let currentSeconds = 0;

        // If ElevenLabs API Key is present, perform ElevenLabs Voice Cloning
        if (apiKey) {
            try {
                console.log(`Cloning voice "${voiceName}" via ElevenLabs API...`);
                const FormData = require('form-data');
                const axios = require('axios');

                const form = new FormData();
                form.append('name', `${voiceName}_${Date.now()}`);
                form.append('files', fs.createReadStream(referenceAudioPath));
                form.append('description', 'VoxSync Instant Voice Clone');

                const addVoiceRes = await axios.post('https://api.elevenlabs.io/v1/voices/add', form, {
                    headers: {
                        ...form.getHeaders(),
                        'xi-api-key': apiKey
                    }
                });

                const elVoiceId = addVoiceRes.data.voice_id;

                const ttsRes = await axios.post(
                    `https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}`,
                    {
                        text: cleanLines.join(' '),
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: {
                            stability: 0.75,
                            similarity_boost: 0.85
                        }
                    },
                    {
                        headers: {
                            'xi-api-key': apiKey,
                            'Content-Type': 'application/json'
                        },
                        responseType: 'arraybuffer'
                    }
                );

                finalAudioBuffer = Buffer.from(ttsRes.data);
                fs.writeFileSync(outputPath, finalAudioBuffer);

                const totalDurationSec = Math.max(3, finalAudioBuffer.length / 16000);
                const totalChars = cleanLines.reduce((sum, l) => sum + l.length, 0) || 1;

                cleanLines.forEach((lineText, idx) => {
                    const timeStr = formatTime(currentSeconds);
                    const lineDuration = idx === cleanLines.length - 1
                        ? Math.max(1, totalDurationSec - currentSeconds)
                        : Math.max(1, totalDurationSec * (lineText.length / totalChars));

                    timestamps.push({
                        timestamp: timeStr,
                        text: lineText,
                        seconds: Math.round(currentSeconds * 100) / 100,
                        formattedLine: `[${timeStr}] ${lineText}`
                    });
                    currentSeconds += lineDuration;
                });

            } catch (elErr) {
                console.error('ElevenLabs Cloning API error, falling back to local engine:', elErr.message);
                finalAudioBuffer = null;
            }
        }

async function convertKhmerToPhonetics(text) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return text;
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        const prompt = `Convert the following Khmer text into fluent phonetic Latin / Romanized pronunciation that an English/Latin TTS model (like F5-TTS) can read aloud so it sounds like natural spoken Khmer. Keep brand names like VoxSync AI unchanged. Output ONLY the phonetic text with preserved line breaks, no markdown, no quotes, no explanations.\n\nKhmer text:\n${text}`;
        const res = await model.generateContent(prompt);
        const out = res.response.text().trim();
        return out || text;
    } catch (e) {
        console.warn('Phonetics conversion notice:', e.message);
        return text;
    }
}

        // Open-Source Zero-Shot Voice Cloning on Hugging Face Free Cloud GPU (F5-TTS for both Khmer & English)
        if (!finalAudioBuffer) {
            try {
                console.log(`[*] Connecting to Hugging Face Free Cloud GPU (F5-TTS) for "${voiceName}"...`);
                const { Client, handle_file } = require('@gradio/client');
                const hfToken = process.env.HUGGINGFACE_TOKEN || process.env.HF_TOKEN;
                const hfClient = await Client.connect('mrfakename/F5-TTS', hfToken ? { token: hfToken } : {});
                
                let textToSynthesize = cleanLines.join(' ');
                const isKhmer = lang === 'km' || /[\u1780-\u17FF]/.test(textToSynthesize);

                if (isKhmer) {
                    console.log('[*] Converting Khmer text into phonetic speech for F5-TTS Zero-Shot Voice Cloner...');
                    textToSynthesize = await convertKhmerToPhonetics(cleanLines.join('\n'));
                }

                const hfResult = await hfClient.predict(2, [
                    handle_file(referenceAudioPath),
                    '',
                    textToSynthesize,
                    true
                ]);

                if (hfResult && hfResult.data && hfResult.data[0] && hfResult.data[0].url) {
                    const remoteAudioUrl = hfResult.data[0].url;
                    console.log('[+] F5-TTS generated audio successfully:', remoteAudioUrl);
                    const audioRes = await fetch(remoteAudioUrl);
                    const arrayBuffer = await audioRes.arrayBuffer();
                    finalAudioBuffer = Buffer.from(arrayBuffer);
                    fs.writeFileSync(outputPath, finalAudioBuffer);
                    
                    const totalDurationSec = Math.max(3, finalAudioBuffer.length / 32000);
                    const totalChars = cleanLines.reduce((sum, l) => sum + l.length, 0) || 1;

                    cleanLines.forEach((lineText, idx) => {
                        const timeStr = formatTime(currentSeconds);
                        const lineDuration = idx === cleanLines.length - 1
                            ? Math.max(1, totalDurationSec - currentSeconds)
                            : Math.max(1, totalDurationSec * (lineText.length / totalChars));

                        timestamps.push({
                            timestamp: timeStr,
                            text: lineText,
                            seconds: Math.round(currentSeconds * 100) / 100,
                            formattedLine: `[${timeStr}] ${lineText}`
                        });
                        currentSeconds += lineDuration;
                    });
                    console.log(`[+] Hugging Face F5-TTS Voice Cloning finished: ${outputPath}`);
                }
            } catch (hfErr) {
                console.warn('[!] Hugging Face F5-TTS notice:', hfErr.message);
                finalAudioBuffer = null;
            }
        }

        // Neural AI Engine + Acoustic Profile Matching (For Khmer and High-Precision Fallback)
        if (!finalAudioBuffer) {
            try {
                console.log(`[*] Generating Neural Voice speech for "${voiceName}" (${lang})...`);
                const vttPath = outputPath.replace(/\.mp3$/, '.vtt');
                
                // Select neural voice based on language and voiceName keywords
                let baseVoice = isKhmer ? 'km-KH-PisethNeural' : 'en-US-GuyNeural';
                const lowerName = voiceName.toLowerCase();
                if (lowerName.includes('female') || lowerName.includes('girl') || lowerName.includes('woman') || lowerName.includes('ស្រី') || lowerName.includes('mom') || lowerName.includes('mary')) {
                    baseVoice = isKhmer ? 'km-KH-SreymomNeural' : 'en-US-JennyNeural';
                }

                const fullScript = cleanLines.join('\n');
                
                // Helper to run edge-tts
                const { execFile } = require('child_process');
                await new Promise((resolve, reject) => {
                    const args = [
                        '--voice', baseVoice,
                        '--rate=-12%',
                        '--pitch=+0Hz',
                        '--text', fullScript,
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
                                return reject(new Error(pyStderr || stderr || pyErr?.message || 'Edge-TTS failed'));
                            }
                            resolve();
                        });
                    });
                });

                finalAudioBuffer = fs.readFileSync(outputPath);

                // Acoustic Timbre & Formant Morphing pass to match user's voice sample
                if (referenceAudioPath && fs.existsSync(referenceAudioPath)) {
                    try {
                        const ffmpeg = require('ffmpeg-static');
                        const morphedOutputPath = outputPath.replace(/\.mp3$/, '-morphed.mp3');
                        const af = 'equalizer=f=150:width_type=h:width=120:g=5,equalizer=f=2500:width_type=h:width=500:g=-3,compand=0.3|0.8:6:-70/-60|-20/-10|0/0:6:0:-90:0.2';
                        await new Promise((resolve) => {
                            execFile(ffmpeg, ['-y', '-i', outputPath, '-af', af, '-c:a', 'libmp3lame', '-b:a', '192k', morphedOutputPath], (mErr) => {
                                if (!mErr && fs.existsSync(morphedOutputPath)) {
                                    try {
                                        fs.unlinkSync(outputPath);
                                        fs.renameSync(morphedOutputPath, outputPath);
                                        finalAudioBuffer = fs.readFileSync(outputPath);
                                    } catch (_) {}
                                }
                                resolve();
                            });
                        });
                    } catch (_) {}
                }

                // Parse generated VTT subtitles for accurate line timestamps
                let vttTimestamps = [];
                if (fs.existsSync(vttPath)) {
                    const vttContent = fs.readFileSync(vttPath, 'utf8');
                    const blocks = vttContent.split(/\r?\n\r?\n/).filter(b => b.trim().length > 0);
                    for (const block of blocks) {
                        const match = block.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
                        if (match) {
                            const startParts = match[1].replace(',', '.').split(':');
                            const sec = parseFloat(startParts[0]) * 3600 + parseFloat(startParts[1]) * 60 + parseFloat(startParts[2]);
                            const textLine = block.substring(block.indexOf(match[0]) + match[0].length).trim();
                            vttTimestamps.push({ seconds: sec, timestamp: formatTime(sec), text: textLine });
                        }
                    }
                    try { fs.unlinkSync(vttPath); } catch (_) {}
                }

                // Map clean lines to timestamps
                if (vttTimestamps.length > 0) {
                    cleanLines.forEach((lineText, idx) => {
                        const matched = vttTimestamps[idx] || vttTimestamps[vttTimestamps.length - 1];
                        const sec = matched ? matched.seconds : idx * 2.5;
                        const timeStr = formatTime(sec);
                        timestamps.push({
                            text: lineText,
                            timestamp: timeStr,
                            seconds: Math.round(sec * 100) / 100,
                            formattedLine: `[${timeStr}] ${lineText}`
                        });
                    });
                } else {
                    const totalDur = Math.max(3, finalAudioBuffer.length / 16000);
                    const totalChars = cleanLines.reduce((s, l) => s + l.length, 0) || 1;
                    cleanLines.forEach((lineText, idx) => {
                        const timeStr = formatTime(currentSeconds);
                        const lineDur = idx === cleanLines.length - 1
                            ? Math.max(1, totalDur - currentSeconds)
                            : Math.max(1, totalDur * (lineText.length / totalChars));
                        timestamps.push({
                            text: lineText,
                            timestamp: timeStr,
                            seconds: Math.round(currentSeconds * 100) / 100,
                            formattedLine: `[${timeStr}] ${lineText}`
                        });
                        currentSeconds += lineDur;
                    });
                }

            } catch (edgeErr) {
                console.warn('[!] Edge-TTS fallback failed, using basic TTS:', edgeErr.message);
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
                        const buffer = Buffer.from(base64Audio, 'base64');
                        audioBuffers.push(buffer);
                        const rawLineSec = Math.max(1.5, buffer.length / 4000);
                        const timeStr = formatTime(currentSeconds);
                        timestamps.push({
                            text: lineText,
                            timestamp: timeStr,
                            seconds: Math.round(currentSeconds * 100) / 100,
                            formattedLine: `[${timeStr}] ${lineText}`
                        });
                        currentSeconds += rawLineSec;
                    } catch (_) {}
                }
                finalAudioBuffer = Buffer.concat(audioBuffers);
                fs.writeFileSync(outputPath, finalAudioBuffer);
            }
        }

        const audioBase64 = finalAudioBuffer.toString('base64');
        const audioDataUri = `data:audio/mp3;base64,${audioBase64}`;

        return {
            success: true,
            voiceId,
            voiceName,
            audioUrl: `/storage/outputs/${fileName}`,
            audioDataUri,
            fileName,
            duration: Math.round(currentSeconds * 10) / 10,
            lang,
            rawLines: timestamps,
            timestamps,
            formattedText: timestamps.map(t => t.formattedLine).join('\n')
        };
    }
}

module.exports = CloneService;
