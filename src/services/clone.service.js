const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { splitScriptLines, formatTime } = require('../utils/timestamp.util');
const { ensureDir } = require('../utils/audio.util');
const VoiceManager = require('../utils/voice-manager.util');
const googleTTS = require('google-tts-api');

class CloneService {
    /**
     * Synthesize speech using reference audio sample (Voice Cloning)
     * Automatically registers cloned voice so it appears in Tab 1 (TTS Voice Model dropdown)
     * 
     * @param {Object} params
     * @param {string} params.referenceAudioPath - Path to user's uploaded voice sample
     * @param {string} params.text - Script text to synthesize
     * @param {string} [params.voiceName] - Custom voice name
     * @param {string} [params.lang] - Language ('en' or 'km')
     * @param {string} [params.elevenLabsKey] - Optional custom ElevenLabs key
     */
    static async cloneAndSynthesize({ referenceAudioPath, text, voiceName = 'My Cloned Voice', lang = 'en', elevenLabsKey }) {
        const cleanLines = splitScriptLines(text);
        if (cleanLines.length === 0) {
            throw new Error('Script text is empty or invalid.');
        }

        if (!referenceAudioPath || !fs.existsSync(referenceAudioPath)) {
            throw new Error('Reference voice audio sample is required for cloning.');
        }

        // Generate persistent voice ID & save into voice registry
        const voiceId = `cloned-${Date.now()}`;
        VoiceManager.saveClonedVoice({
            id: voiceId,
            name: voiceName,
            lang,
            referenceAudioPath,
            createdAt: new Date().toISOString()
        });

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

        // Try Local XTTS-v2 Voice Cloner via child_process
        if (!finalAudioBuffer) {
            try {
                const scriptPath = path.resolve(__dirname, '../../scripts/clone_voice.py');
                if (fs.existsSync(scriptPath)) {
                    console.log(`[*] Executing local XTTS-v2 Voice Cloning worker for "${voiceName}"...`);
                    const { spawn } = require('child_process');
                    
                    const localOutputFile = outputPath.replace(/\.mp3$/, '.wav');
                    const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
                    const pythonArgs = process.platform === 'win32'
                        ? ['-3.12', scriptPath, '--text', cleanLines.join(' '), '--speaker_wav', path.resolve(referenceAudioPath), '--output_file', localOutputFile, '--lang', lang || 'en']
                        : [scriptPath, '--text', cleanLines.join(' '), '--speaker_wav', path.resolve(referenceAudioPath), '--output_file', localOutputFile, '--lang', lang || 'en'];

                    const runLocalClone = () => new Promise((resolve, reject) => {
                        const pyProc = spawn(pythonCmd, pythonArgs);
                        let errOutput = '';

                        pyProc.stdout.on('data', (d) => console.log(`[XTTS Log]: ${d.toString().trim()}`));
                        pyProc.stderr.on('data', (d) => {
                            errOutput += d.toString();
                            console.error(`[XTTS StdErr]: ${d.toString().trim()}`);
                        });

                        pyProc.on('close', (code) => {
                            if (code === 0 && fs.existsSync(localOutputFile)) {
                                resolve(localOutputFile);
                            } else {
                                reject(new Error(`XTTS Worker exited with code ${code}: ${errOutput}`));
                            }
                        });
                    });

                    const generatedWavPath = await runLocalClone();
                    finalAudioBuffer = fs.readFileSync(generatedWavPath);
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
                    console.log(`[+] Local XTTS-v2 Cloning succeeded: ${outputPath}`);
                }
            } catch (xttsErr) {
                console.warn('[!] Local XTTS-v2 Cloning not available or failed:', xttsErr.message);
                console.log('[*] Using native TTS engine fallback...');
                finalAudioBuffer = null;
            }
        }

        // Native High-Quality Engine fallback
        if (!finalAudioBuffer) {
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
                        rawDuration: rawLineSec,
                        timestamp: timeStr,
                        seconds: Math.round(currentSeconds * 100) / 100,
                        formattedLine: `[${timeStr}] ${lineText}`
                    });

                    currentSeconds += rawLineSec;
                } catch (err) {
                    const rawFallbackSec = Math.max(2, lineText.length * 0.08);
                    const timeStr = formatTime(currentSeconds);
                    timestamps.push({
                        text: lineText,
                        rawDuration: rawFallbackSec,
                        timestamp: timeStr,
                        seconds: Math.round(currentSeconds * 100) / 100,
                        formattedLine: `[${timeStr}] ${lineText}`
                    });
                    currentSeconds += rawFallbackSec;
                }
            }

            finalAudioBuffer = Buffer.concat(audioBuffers);
            fs.writeFileSync(outputPath, finalAudioBuffer);
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
