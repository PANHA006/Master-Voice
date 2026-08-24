const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const config = require('../config/config');
const { ensureDir } = require('../utils/audio.util');
const VoiceManager = require('../utils/voice-manager.util');
const STTService = require('./stt.service');

// Acoustic fallback DSP parameter mappings for Voice Models when STT is offline
const VOICE_MODEL_DSP_MAP = {
    // 🎬 សម្រាយរឿង (Recap & Storytelling Series)
    'km-recap-cinema': { pitchFactor: 0.68, eq: 'equalizer=f=100:width_type=h:width=80:g=8,equalizer=f=2500:width_type=h:width=400:g=-4' },
    'km-recap-drama': { pitchFactor: 1.30, eq: 'equalizer=f=2400:width_type=h:width=400:g=4,highpass=f=120' },
    'km-recap-suspense': { pitchFactor: 0.62, eq: 'equalizer=f=80:width_type=h:width=70:g=9,lowpass=f=4000' },

    // 🎭 សម្លេងតួអង្គ (Character Series)
    'km-char-elder-m': { pitchFactor: 0.80, eq: 'vibrato=f=4:d=0.22,equalizer=f=120:width_type=h:width=80:g=4,lowpass=f=4500' },
    'km-char-elder-f': { pitchFactor: 1.15, eq: 'vibrato=f=3.8:d=0.22,equalizer=f=2200:width_type=h:width=300:g=3' },
    'km-char-villain': { pitchFactor: 0.58, eq: 'equalizer=f=80:width_type=h:width=60:g=8,aecho=0.8:0.5:30:0.25' },
    'km-char-hero': { pitchFactor: 0.78, eq: 'equalizer=f=150:width_type=h:width=100:g=5' },
    'km-char-heroine': { pitchFactor: 1.42, eq: 'equalizer=f=2800:width_type=h:width=300:g=5,highpass=f=150' },

    // 👶 សម្លេងក្មេង (Kids & Animation)
    'km-child-boy': { pitchFactor: 1.46, eq: 'equalizer=f=3000:width_type=h:width=300:g=5,highpass=f=160' },
    'km-child-girl': { pitchFactor: 1.58, eq: 'equalizer=f=3400:width_type=h:width=300:g=6,highpass=f=200' },
    'km-child-cartoon': { pitchFactor: 1.72, eq: 'equalizer=f=3800:width_type=h:width=300:g=6,highpass=f=220' },

    // 📚 វីដេអូអប់រំ & ចំណេះដឹង (Education Series)
    'km-edu-professor': { pitchFactor: 0.76, eq: 'equalizer=f=130:width_type=h:width=100:g=5' },
    'km-edu-explainer': { pitchFactor: 0.80, eq: 'equalizer=f=150:width_type=h:width=100:g=4' },
    'km-edu-history': { pitchFactor: 0.72, eq: 'equalizer=f=110:width_type=h:width=90:g=6' },
    'km-edu-motivation': { pitchFactor: 0.82, eq: 'equalizer=f=160:width_type=h:width=100:g=4' },
    'km-edu-instructor': { pitchFactor: 1.32, eq: 'equalizer=f=2400:width_type=h:width=400:g=4,highpass=f=120' },
    'km-edu-kids-teacher': { pitchFactor: 1.45, eq: 'equalizer=f=3000:width_type=h:width=300:g=5,highpass=f=150' },
    'km-edu-documentary-f': { pitchFactor: 1.28, eq: 'equalizer=f=2200:width_type=h:width=350:g=3,highpass=f=100' },
    'km-edu-mindfulness': { pitchFactor: 1.22, eq: 'equalizer=f=2000:width_type=h:width=300:g=3' },

    // 👨 Piseth Series
    'km-KH-PisethNeural': { pitchFactor: 0.78, eq: 'equalizer=f=140:width_type=h:width=100:g=5' },
    'km-piseth-edu': { pitchFactor: 0.76, eq: 'equalizer=f=130:width_type=h:width=100:g=5' },
    'km-piseth-doc': { pitchFactor: 0.68, eq: 'equalizer=f=100:width_type=h:width=80:g=7' },
    'km-piseth-story': { pitchFactor: 0.75, eq: 'equalizer=f=135:width_type=h:width=90:g=5' },
    'km-piseth-promo': { pitchFactor: 0.84, eq: 'equalizer=f=180:width_type=h:width=120:g=4' },

    // 👩 Sreymom Series
    'km-KH-SreymomNeural': { pitchFactor: 1.34, eq: 'equalizer=f=2400:width_type=h:width=400:g=4,highpass=f=120' },
    'km-sreymom-edu': { pitchFactor: 1.30, eq: 'equalizer=f=2300:width_type=h:width=350:g=4,highpass=f=110' },
    'km-sreymom-story': { pitchFactor: 1.25, eq: 'equalizer=f=2100:width_type=h:width=300:g=3,highpass=f=100' },
    'km-sreymom-news': { pitchFactor: 1.36, eq: 'equalizer=f=2500:width_type=h:width=350:g=4,highpass=f=120' },
    'km-sreymom-fun': { pitchFactor: 1.44, eq: 'equalizer=f=2800:width_type=h:width=300:g=5,highpass=f=140' },

    // 🇺🇸 English Voices
    'en-US-JennyNeural': { pitchFactor: 1.35, eq: 'equalizer=f=2400:width_type=h:width=400:g=4,highpass=f=120' },
    'en-US-GuyNeural': { pitchFactor: 0.78, eq: 'equalizer=f=140:width_type=h:width=100:g=5' },
    'en-US-AriaNeural': { pitchFactor: 1.38, eq: 'equalizer=f=2600:width_type=h:width=350:g=4,highpass=f=120' },
    'en-US-ChristopherNeural': { pitchFactor: 0.76, eq: 'equalizer=f=130:width_type=h:width=100:g=5' },
    'en-US-EricNeural': { pitchFactor: 0.75, eq: 'equalizer=f=120:width_type=h:width=90:g=5' },
    'en-US-AnaNeural': { pitchFactor: 1.48, eq: 'equalizer=f=3000:width_type=h:width=300:g=5,highpass=f=150' },
    'en-GB-SoniaNeural': { pitchFactor: 1.33, eq: 'equalizer=f=2400:width_type=h:width=400:g=4,highpass=f=120' },
    'en-GB-RyanNeural': { pitchFactor: 0.78, eq: 'equalizer=f=140:width_type=h:width=100:g=5' },
    'en-AU-NatashaNeural': { pitchFactor: 1.33, eq: 'equalizer=f=2400:width_type=h:width=400:g=4,highpass=f=120' },
    'en-AU-WilliamNeural': { pitchFactor: 0.78, eq: 'equalizer=f=140:width_type=h:width=100:g=5' }
};

class VoiceChangerService {
    /**
     * Get list of all available voice models organized for Voice Changer
     */
    static getVoiceModels() {
        return VoiceManager.getAllVoices();
    }

    /**
     * Helper to detect audio speech pauses and segments using FFmpeg
     */
    static detectAudioSegments(audioPath) {
        return new Promise((resolve) => {
            execFile(ffmpeg, ['-i', path.resolve(audioPath), '-af', 'silencedetect=noise=-30dB:d=0.45', '-f', 'null', '-'], (err, stdout, stderr) => {
                const text = stderr || '';
                let totalDuration = 1;
                const durMatch = text.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                if (durMatch) {
                    totalDuration = parseInt(durMatch[1], 10) * 3600 + parseInt(durMatch[2], 10) * 60 + parseFloat(durMatch[3]);
                }

                const silenceStarts = [];
                const lines = text.split('\n');
                lines.forEach(l => {
                    const sMatch = l.match(/silence_start: (\d+\.?\d*)/);
                    if (sMatch) {
                        const sec = parseFloat(sMatch[1]);
                        if (sec > 0.5 && (silenceStarts.length === 0 || sec - silenceStarts[silenceStarts.length - 1] > 3.0)) {
                            silenceStarts.push(sec);
                        }
                    }
                });

                resolve({ totalDuration, silenceStarts });
            });
        });
    }

    static formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Transform audio recording using chosen Voice Model
     * Supports both Dual-Neural Speech-to-Speech Resynthesis (with Gemini AI) & Acoustic DSP Morphing
     * 
     * @param {Object} params
     * @param {string} params.inputPath - Path to uploaded/recorded input audio
     * @param {string} [params.voice] - Target Voice Model ID (e.g. 'km-recap-cinema', 'km-KH-PisethNeural', etc.)
     * @param {number} [params.pitchShift] - Custom semitones (-12 to +12)
     * @param {number} [params.speed] - Speed multiplier (0.5 to 2.0)
     * @param {boolean|string} [params.removeNoise] - Noise suppression mode ('off', 'light', 'medium', 'strong')
     * @param {string} [params.customApiKey] - Optional Gemini API Key for Timestamps and Neural Speech
     */
    static async transformAudio({ inputPath, voice = 'km-recap-cinema', preset, pitchShift, speed = 1.0, removeNoise = 'medium', customApiKey }) {
        if (!inputPath || !fs.existsSync(inputPath)) {
            throw new Error('Input audio file is missing or invalid.');
        }

        const TTSService = require('./tts.service');
        const apiKey = customApiKey || config.geminiApiKey;
        const speedFactor = Math.max(0.5, Math.min(2.0, Number(speed) || 1.0));
        const selectedVoice = voice || preset || 'km-recap-cinema';

        // 1. Try Neural Speech-to-Speech (STT -> Target Voice Model TTS) if Gemini is available
        if (apiKey) {
            try {
                const sttResult = await STTService.transcribe({
                    filePath: inputPath,
                    mimeType: 'audio/mp3',
                    customApiKey: apiKey
                });

                if (sttResult && sttResult.lines && sttResult.lines.length > 0 && !sttResult.warning) {
                    const fullText = sttResult.lines.map(l => l.text).join('\n');
                    const targetLang = selectedVoice.startsWith('en-') ? 'en' : 'km';

                    // Synthesize using the target Voice Model
                    const ttsResult = await TTSService.synthesize({
                        text: fullText,
                        voice: selectedVoice,
                        lang: targetLang,
                        rate: speedFactor
                    });

                    if (ttsResult && ttsResult.audioDataUri) {
                        return {
                            success: true,
                            mode: 'neural-voice-model',
                            audioUrl: ttsResult.audioUrl,
                            audioDataUri: ttsResult.audioDataUri,
                            fileName: ttsResult.fileName,
                            voice: selectedVoice,
                            duration: ttsResult.duration,
                            hasGeminiKey: true,
                            timestamps: ttsResult.timestamps || sttResult.lines,
                            formattedText: ttsResult.formattedText || sttResult.formattedText
                        };
                    }
                }
            } catch (neuralErr) {
                console.warn('[VoiceChanger] Neural STT/TTS synthesis note, falling back to Acoustic DSP:', neuralErr.message);
            }
        }

        // 2. Acoustic DSP Morphing Engine (Fallback / Pure Offline DSP)
        ensureDir(config.outputsDir);
        const fileName = `voice-change-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp3`;
        const outputPath = path.join(config.outputsDir, fileName);

        const filterParts = [];

        // Noise Reduction Filter
        if (removeNoise && removeNoise !== 'off' && removeNoise !== 'false') {
            let nrDb = 18;
            let nfDb = -30;
            if (removeNoise === 'light') {
                nrDb = 12;
                nfDb = -25;
            } else if (removeNoise === 'strong') {
                nrDb = 25;
                nfDb = -35;
            }
            filterParts.push(`afftdn=nr=${nrDb}:nf=${nfDb}:tn=1,highpass=f=75,lowpass=f=12500`);
        }

        // Sample rate normalization to 44.1kHz
        filterParts.push('aformat=sample_rates=44100');

        // Determine pitch factor and EQ matching the Voice Model
        let pitchFactor = 1.0;
        let extraEq = '';

        if (pitchShift !== undefined && pitchShift !== null && !isNaN(Number(pitchShift)) && Number(pitchShift) !== 0) {
            const semitones = Number(pitchShift);
            pitchFactor = Math.pow(2, semitones / 12);
            if (semitones < 0) {
                extraEq = `equalizer=f=130:width_type=h:width=100:g=${Math.min(8, Math.abs(semitones))}`;
            } else if (semitones > 0) {
                extraEq = `equalizer=f=2600:width_type=h:width=400:g=${Math.min(6, semitones)},highpass=f=100`;
            }
        } else {
            const dspProfile = VOICE_MODEL_DSP_MAP[selectedVoice] || (
                selectedVoice.includes('Sreymom') || selectedVoice.includes('Jenny') || selectedVoice.includes('female') || selectedVoice.includes('girl') || selectedVoice.includes('heroine') || selectedVoice.includes('drama')
                    ? { pitchFactor: 1.34, eq: 'equalizer=f=2400:width_type=h:width=400:g=4,highpass=f=120' }
                    : { pitchFactor: 0.78, eq: 'equalizer=f=140:width_type=h:width=100:g=5' }
            );
            pitchFactor = dspProfile.pitchFactor || 1.0;
            extraEq = dspProfile.eq || '';
        }

        const tempoMultiplier = (1 / pitchFactor) * speedFactor;

        // Construct rate & tempo filter chain
        filterParts.push(`asetrate=44100*${pitchFactor.toFixed(4)}`);

        let remTempo = tempoMultiplier;
        while (remTempo < 0.5) {
            filterParts.push('atempo=0.5');
            remTempo /= 0.5;
        }
        while (remTempo > 2.0) {
            filterParts.push('atempo=2.0');
            remTempo /= 2.0;
        }
        filterParts.push(`atempo=${remTempo.toFixed(4)}`);

        filterParts.push('aresample=44100');

        if (extraEq) {
            filterParts.push(extraEq);
        }

        const fullAudioFilter = filterParts.join(',');

        // Execute FFmpeg transformation
        await new Promise((resolve, reject) => {
            const args = [
                '-y',
                '-i', path.resolve(inputPath),
                '-af', fullAudioFilter,
                '-ar', '44100',
                '-b:a', '192k',
                path.resolve(outputPath)
            ];

            execFile(ffmpeg, args, { windowsHide: true }, (err, stdout, stderr) => {
                if (err) {
                    console.error('[VoiceChanger] FFmpeg execution error:', stderr || err.message);
                    return reject(new Error(`Voice conversion failed: ${stderr || err.message}`));
                }
                resolve();
            });
        });

        const transformedBuffer = fs.readFileSync(outputPath);
        const audioBase64 = transformedBuffer.toString('base64');
        const { totalDuration, silenceStarts } = await this.detectAudioSegments(outputPath);

        // Build accurate silence-aligned intervals across audio duration
        const segmentPoints = [0, ...silenceStarts];
        const timestamps = segmentPoints.map((sec, idx) => {
            const timeStr = this.formatTime(sec);
            const nextSec = idx < segmentPoints.length - 1 ? segmentPoints[idx + 1] : totalDuration;
            const text = `ចង្វាក់និយាយ ${timeStr} - ${this.formatTime(nextSec)}`;
            return {
                timestamp: timeStr,
                text,
                seconds: Math.round(sec * 100) / 100,
                formattedLine: `[${timeStr}] ${text}`
            };
        });
        const formattedText = timestamps.map(t => t.formattedLine).join('\n');

        return {
            success: true,
            mode: 'acoustic-dsp-morph',
            audioUrl: `/storage/outputs/${fileName}`,
            audioDataUri: `data:audio/mp3;base64,${audioBase64}`,
            fileName,
            voice: selectedVoice,
            duration: Math.round(totalDuration * 10) / 10,
            hasGeminiKey: Boolean(apiKey),
            timestamps,
            formattedText
        };
    }
}

module.exports = VoiceChangerService;

