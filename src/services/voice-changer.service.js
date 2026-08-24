const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const config = require('../config/config');
const { ensureDir } = require('../utils/audio.util');
const STTService = require('./stt.service');

const VOICE_PRESETS = {
    // 👩 ➡️ 👨 Female to Male Presets (ប្តូរពីស្រីទៅប្រុស)
    'female-to-male': {
        name: '👩 ➡️ 👨 សំឡេងស្រី ទៅជា បុរសទូទៅ (Female to Male)',
        category: 'Gender Shift',
        description: 'បន្ថយកម្រិតសំឡេង និងបន្ថែមសំនៀងគ្រលរធ្ងន់បែបបុរសធម្មជាតិ',
        pitchFactor: 0.75,
        eq: 'equalizer=f=140:width_type=h:width=100:g=6,equalizer=f=3000:width_type=h:width=500:g=-3'
    },
    'female-to-male-deep': {
        name: '👩 ➡️ 🎬 សំឡេងស្រី ទៅជា បុរសគ្រលរជ្រៅ (Deep Cinema Baritone)',
        category: 'Gender Shift',
        description: 'សំឡេងបុរសគ្រលរធំ ជ្រៅ ស័ក្តិសមសម្រាប់សម្រាយរឿង និងរៀបរាប់',
        pitchFactor: 0.68,
        eq: 'equalizer=f=100:width_type=h:width=80:g=8,equalizer=f=2500:width_type=h:width=400:g=-4'
    },
    'female-to-male-young': {
        name: '👩 ➡️ 🧑 សំឡេងស្រី ទៅជា យុវជនប្រុស (Young Man / Teen Male)',
        category: 'Gender Shift',
        description: 'សំឡេងបុរសវ័យក្មេង ស្រួយស្រាល និងស្វាហាប់',
        pitchFactor: 0.84,
        eq: 'equalizer=f=200:width_type=h:width=120:g=4'
    },

    // 👨 ➡️ 👩 Male to Female Presets (ប្តូរពីប្រុសទៅស្រី)
    'male-to-female': {
        name: '👨 ➡️ 👩 សំឡេងប្រុស ទៅជា នារីទូទៅ (Male to Female)',
        category: 'Gender Shift',
        description: 'តម្លើងកម្រិតសំឡេង និង Formant ឱ្យក្លាយជាសំឡេងនារីធម្មជាតិ',
        pitchFactor: 1.33,
        eq: 'equalizer=f=2400:width_type=h:width=400:g=4,highpass=f=120'
    },
    'male-to-female-sweet': {
        name: '👨 ➡️ 🌸 សំឡេងប្រុស ទៅជា នារីផ្អែមល្ហែម (Sweet Soft Female)',
        category: 'Gender Shift',
        description: 'សំឡេងនារីស្រួយ ស្រទន់ ពិរោះបែប Anime / នារីវ័យក្មេង',
        pitchFactor: 1.42,
        eq: 'equalizer=f=2800:width_type=h:width=300:g=5,highpass=f=150'
    },

    // 👶 សម្លេងក្មេង (To Child / Kid)
    'to-child-boy': {
        name: '👦 ប្តូរទៅជា សំឡេងកុមារា (Little Boy)',
        category: 'Kids',
        description: 'សំឡេងក្មេងប្រុសតូច រស់រវើក ស្រួយស្រាល',
        pitchFactor: 1.46,
        eq: 'equalizer=f=3000:width_type=h:width=300:g=5,highpass=f=160'
    },
    'to-child-girl': {
        name: '👧 ប្តូរទៅជា សំឡេងកុមារី (Little Girl)',
        category: 'Kids',
        description: 'សំឡេងក្មេងស្រីតូច គួរឱ្យស្រឡាញ់',
        pitchFactor: 1.58,
        eq: 'equalizer=f=3400:width_type=h:width=300:g=6,highpass=f=200'
    },
    'to-child-baby': {
        name: '🐣 ប្តូរទៅជា សំឡេងកូនក្មេងតូច / គំនូរជីវចល (Cute Toddler / Cartoon)',
        category: 'Kids',
        description: 'សំឡេងកូនក្មេងតូចបែបតុក្កតាគំនូរជីវចល',
        pitchFactor: 1.72,
        eq: 'equalizer=f=3800:width_type=h:width=300:g=6,highpass=f=220'
    },

    // 🎭 សម្លេងតួអង្គ (Character & Fantasy)
    'to-elderly-grandfather': {
        name: '👴 ប្តូរទៅជា លោកតាចាស់ (Elderly Grandfather)',
        category: 'Characters',
        description: 'សំឡេងមនុស្សចាស់ យឺតៗ ធ្ងន់ និងមានរំញ័រស្រាល',
        pitchFactor: 0.82,
        eq: 'vibrato=f=4:d=0.22,equalizer=f=120:width_type=h:width=80:g=4,lowpass=f=4500'
    },
    'to-elderly-grandmother': {
        name: '👵 ប្តូរទៅជា លោកយាយចាស់ (Elderly Grandmother)',
        category: 'Characters',
        description: 'សំឡេងលោកយាយចាស់ ចិត្តល្អ និងមានរំញ័រ',
        pitchFactor: 1.15,
        eq: 'vibrato=f=3.8:d=0.22,equalizer=f=2200:width_type=h:width=300:g=3'
    },
    'to-villain-monster': {
        name: '😈 ប្តូរទៅជា តួអង្គបិសាច / មេចោរ (Villain & Monster)',
        category: 'Characters',
        description: 'សំឡេងគ្រលរធំ ជ្រៅ និងមាន Echo បែបបិសាច',
        pitchFactor: 0.60,
        eq: 'equalizer=f=80:width_type=h:width=60:g=8,aecho=0.8:0.5:30:0.25'
    },
    'to-robot-scifi': {
        name: '🤖 ប្តូរទៅជា សំឡេងមនុស្សយន្ត (Sci-Fi Robot)',
        category: 'Special Effects',
        description: 'សំឡេងមនុស្សយន្ត បែបដែក និង Flanger Modulation',
        pitchFactor: 1.0,
        eq: 'flanger=delay=5:depth=2:regen=50:width=80,equalizer=f=1100:width_type=h:width=200:g=6'
    }
};

class VoiceChangerService {
    static getPresets() {
        return VOICE_PRESETS;
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
     * Transform audio recording using DSP voice conversion filters
     * Preserves 100% of the original speaker's rhythm, pauses, emotion, and cadence!
     * 
     * @param {Object} params
     * @param {string} params.inputPath - Path to uploaded/recorded input audio
     * @param {string} [params.preset] - Chosen preset key
     * @param {number} [params.pitchShift] - Semitones (-12 to +12)
     * @param {number} [params.speed] - Speed multiplier (0.5 to 2.0)
     * @param {boolean|string} [params.removeNoise] - Noise suppression mode ('off', 'light', 'medium', 'strong')
     * @param {string} [params.customApiKey] - Optional Gemini API Key for Timestamps
     */
    static async transformAudio({ inputPath, preset = 'female-to-male', pitchShift, speed = 1.0, removeNoise = 'medium', customApiKey }) {
        if (!inputPath || !fs.existsSync(inputPath)) {
            throw new Error('Input audio file is missing or invalid.');
        }

        ensureDir(config.outputsDir);
        const fileName = `voice-change-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp3`;
        const outputPath = path.join(config.outputsDir, fileName);

        const filterParts = [];

        // 1. Noise Reduction Filter (afftdn + rumble highpass/lowpass)
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

        // 2. Sample rate normalization to 44.1kHz BEFORE pitch/tempo processing
        filterParts.push('aformat=sample_rates=44100');

        // Determine pitch factor and speed
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
            const presetConfig = VOICE_PRESETS[preset] || VOICE_PRESETS['female-to-male'];
            pitchFactor = presetConfig.pitchFactor || 1.0;
            extraEq = presetConfig.eq || '';
        }

        const speedFactor = Math.max(0.5, Math.min(2.0, Number(speed) || 1.0));
        // Exact tempo multiplier to guarantee 100% length equality at speed 1.0
        const tempoMultiplier = (1 / pitchFactor) * speedFactor;

        // Construct rate & tempo filter chain
        filterParts.push(`asetrate=44100*${pitchFactor.toFixed(4)}`);

        // Chain multiple atempo filters if tempoMultiplier is outside [0.5, 2.0]
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

        // 3. Resample back to standard 44.1kHz
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

        // Detect real duration and speech pauses
        const { totalDuration, silenceStarts } = await this.detectAudioSegments(outputPath);

        // Perform STT Transcription on the transformed audio to extract synchronized timestamps
        let timestamps = [];
        let formattedText = '';
        const apiKey = customApiKey || config.geminiApiKey;

        if (apiKey) {
            try {
                const sttResult = await STTService.transcribe({
                    filePath: outputPath,
                    mimeType: 'audio/mp3',
                    customApiKey: apiKey
                });

                if (sttResult && sttResult.lines && sttResult.lines.length > 0 && !sttResult.warning) {
                    timestamps = sttResult.lines.map(l => ({
                        timestamp: l.timestamp,
                        text: l.text,
                        seconds: l.seconds,
                        formattedLine: `[${l.timestamp}] ${l.text}`
                    }));
                    formattedText = sttResult.formattedText || timestamps.map(t => t.formattedLine).join('\n');
                }
            } catch (sttErr) {
                console.warn('[VoiceChanger] Gemini STT notice:', sttErr.message);
            }
        }

        // If no Gemini API Key or STT didn't return real transcript, build accurate silence-aligned intervals across full audio duration
        if (timestamps.length === 0) {
            const segmentPoints = [0, ...silenceStarts];
            timestamps = segmentPoints.map((sec, idx) => {
                const timeStr = this.formatTime(sec);
                const nextSec = idx < segmentPoints.length - 1 ? segmentPoints[idx + 1] : totalDuration;
                const durStr = (nextSec - sec).toFixed(1);
                const text = `កំណាត់សម្លេងទី ${idx + 1} (ចង្វាក់និយាយ ${timeStr} - ${this.formatTime(nextSec)})`;
                return {
                    timestamp: timeStr,
                    text,
                    seconds: Math.round(sec * 100) / 100,
                    formattedLine: `[${timeStr}] ${text}`
                };
            });
            formattedText = timestamps.map(t => t.formattedLine).join('\n');
        }

        return {
            success: true,
            audioUrl: `/storage/outputs/${fileName}`,
            audioDataUri: `data:audio/mp3;base64,${audioBase64}`,
            fileName,
            preset,
            duration: Math.round(totalDuration * 10) / 10,
            hasGeminiKey: Boolean(apiKey),
            timestamps,
            formattedText
        };
    }
}

module.exports = VoiceChangerService;
