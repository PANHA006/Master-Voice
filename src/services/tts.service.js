const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const config = require('../config/config');
const { splitScriptLines, formatTime } = require('../utils/timestamp.util');
const { ensureDir } = require('../utils/audio.util');
const VoiceManager = require('../utils/voice-manager.util');

const KHMER_VOICE_PROFILES = {
    // 📚 វីដេអូអប់រំ & ចំណេះដឹង (Education & Explainer Series)
    'km-edu-professor': { baseVoice: 'km-KH-PisethNeural', rateOffset: -20, pitch: '-3Hz' },       // សាស្ត្រាចារ្យ & បាឋកថា (Academic Professor & Lecture)
    'km-edu-explainer': { baseVoice: 'km-KH-PisethNeural', rateOffset: -16, pitch: '+0Hz' },       // ពន្យល់ចំណេះដឹង & បច្ចេកវិទ្យា (Tech & Knowledge Explainer)
    'km-edu-history': { baseVoice: 'km-KH-PisethNeural', rateOffset: -22, pitch: '-15Hz' },        // ប្រវត្តិសាស្ត្រ & អក្សរសាស្ត្រ (History & Culture Narrator)
    'km-edu-motivation': { baseVoice: 'km-KH-PisethNeural', rateOffset: -14, pitch: '+5Hz' },       // ការលើកទឹកចិត្ត & អភិវឌ្ឍខ្លួន (Motivation & Self-Growth)
    'km-edu-instructor': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -20, pitch: '-4Hz' },     // គ្រូបង្រៀនស្ត្រី E-learning (Female Course Instructor)
    'km-edu-kids-teacher': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -12, pitch: '+26Hz' },   // អ្នកគ្រូបង្រៀនកុមារ / មត្តេយ្យ (Kindergarten & Primary Teacher)
    'km-edu-documentary-f': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -18, pitch: '-10Hz' }, // ធម្មជាតិ វិទ្យាសាស្ត្រ & ភូមិសាស្ត្រ (Nature & Geo Explainer)
    'km-edu-mindfulness': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -24, pitch: '-16Hz' },   // សតិអារម្មណ៍ & សុខភាពផ្លូវចិត្ត (Mindfulness & Mental Health)

    // 🎬 សម្រាយរឿង (Recap & Storytelling Series)
    'km-recap-cinema': { baseVoice: 'km-KH-PisethNeural', rateOffset: -12, pitch: '-18Hz' },       // Movie Recap Pro (ភាពយន្ត)
    'km-recap-drama': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -10, pitch: '-8Hz' },        // Drama & Series Recap (រឿងភាគ)
    'km-recap-suspense': { baseVoice: 'km-KH-PisethNeural', rateOffset: -18, pitch: '-32Hz' },     // Suspense / Horror Recap (ភ័យរន្ធត់ & អាថ៌កំបាំង)

    // 🎭 សម្លេងតួអង្គ (Character & Roleplay Series)
    'km-char-elder-m': { baseVoice: 'km-KH-PisethNeural', rateOffset: -26, pitch: '-42Hz' },       // តួអង្គតាចាស់ / លោកតា (Elderly Grandfather)
    'km-char-elder-f': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -24, pitch: '-30Hz' },      // តួអង្គយាយចាស់ / លោកយាយ (Elderly Grandmother)
    'km-char-villain': { baseVoice: 'km-KH-PisethNeural', rateOffset: -20, pitch: '-50Hz' },       // តួអង្គកាច / មេចោរ / បិសាច (Villain & Monster)
    'km-char-hero': { baseVoice: 'km-KH-PisethNeural', rateOffset: -10, pitch: '-6Hz' },           // តួអង្គវីរបុរស / តួឯកប្រុស (Brave Hero / Anime)
    'km-char-heroine': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -8, pitch: '+32Hz' },        // តួអង្គនារីក្លាហាន / តួឯកស្រី (Sweet Heroine / Princess)

    // 👶 សម្លេងក្មេង (Kids & Animation Series)
    'km-child-boy': { baseVoice: 'km-KH-SreymomNeural', rateOffset: +6, pitch: '+68Hz' },          // សម្លេងកុមារា / ក្មេងប្រុស (Little Boy)
    'km-child-girl': { baseVoice: 'km-KH-SreymomNeural', rateOffset: +8, pitch: '+92Hz' },         // សម្លេងកុមារី / ក្មេងស្រី (Little Girl)
    'km-child-cartoon': { baseVoice: 'km-KH-SreymomNeural', rateOffset: +12, pitch: '+120Hz' },     // សម្លេងកូនក្មេងតូច / គំនូរជីវចល (Cute Baby & Cartoon)

    // 👨 Piseth Series (សំឡេងបុរសទូទៅ)
    'km-KH-PisethNeural': { baseVoice: 'km-KH-PisethNeural', rateOffset: -15, pitch: '+0Hz' },
    'km-piseth-edu': { baseVoice: 'km-KH-PisethNeural', rateOffset: -22, pitch: '-5Hz' },          // Teaching / Calm & deliberate pace
    'km-piseth-doc': { baseVoice: 'km-KH-PisethNeural', rateOffset: -18, pitch: '-25Hz' },        // Deep cinema baritone / Documentary
    'km-piseth-story': { baseVoice: 'km-KH-PisethNeural', rateOffset: -15, pitch: '-12Hz' },      // Warm podcast & storytelling
    'km-piseth-promo': { baseVoice: 'km-KH-PisethNeural', rateOffset: -8, pitch: '+25Hz' },        // High-energy upbeat commercial

    // 👩 Sreymom Series (សំឡេងស្ត្រីទូទៅ)
    'km-KH-SreymomNeural': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -15, pitch: '+0Hz' },
    'km-sreymom-edu': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -22, pitch: '-8Hz' },         // Clear articulate teaching
    'km-sreymom-story': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -18, pitch: '-20Hz' },      // Soothing soft bedtime / audiobook
    'km-sreymom-news': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -14, pitch: '+10Hz' },       // Professional crisp broadcast
    'km-sreymom-fun': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -8, pitch: '+35Hz' }          // Cheerful bright entertainment
};

function runEdgeTTS({ text, voice, rateStr, pitchStr = '+0Hz', outputPath, vttPath }) {
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
            if (!err) {
                return resolve();
            }

            // Fallback: Run via python -m edge_tts
            const pythonArgs = ['-m', 'edge_tts', ...args];
            execFile('python', pythonArgs, { windowsHide: true }, (pyErr, pyStdout, pyStderr) => {
                if (pyErr) {
                    return reject(new Error(pyStderr || stderr || pyErr.message));
                }
                resolve();
            });
        });
    });
}

function parseVttTimestamps(vttContent, cleanLines) {
    if (!vttContent) return [];
    const blocks = vttContent.split(/\r?\n\r?\n/).filter(b => b.trim().length > 0);
    const parsedBlocks = [];

    for (const block of blocks) {
        const match = block.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
        if (match) {
            const startRaw = match[1];
            const endRaw = match[2];
            const textPart = block.substring(block.indexOf(match[0]) + match[0].length).trim();

            const parts = startRaw.replace(',', '.').split(':');
            const startSec = (parseFloat(parts[0]) * 3600) + (parseFloat(parts[1]) * 60) + parseFloat(parts[2]);

            const endParts = endRaw.replace(',', '.').split(':');
            const endSec = (parseFloat(endParts[0]) * 3600) + (parseFloat(endParts[1]) * 60) + parseFloat(endParts[2]);

            parsedBlocks.push({
                startSec,
                endSec,
                duration: endSec - startSec,
                text: textPart
            });
        }
    }

    if (parsedBlocks.length === 0) return [];

    // Map timestamps back to each clean script line
    if (parsedBlocks.length === cleanLines.length) {
        return cleanLines.map((line, idx) => {
            const blk = parsedBlocks[idx];
            const timeStr = formatTime(blk.startSec);
            return {
                text: line,
                rawDuration: Math.round(blk.duration * 100) / 100,
                scaledDuration: Math.round(blk.duration * 100) / 100,
                seconds: Math.round(blk.startSec * 100) / 100,
                timestamp: timeStr,
                formattedLine: `[${timeStr}] ${line}`
            };
        });
    }

    // If block count differs from line count, distribute smoothly based on VTT total span
    const firstSec = parsedBlocks[0].startSec;
    const lastSec = parsedBlocks[parsedBlocks.length - 1].endSec;
    const totalSec = Math.max(1, lastSec - firstSec);
    const totalChars = cleanLines.reduce((sum, l) => sum + Math.max(5, l.length), 0) || 1;

    let curSec = firstSec;
    return cleanLines.map((line) => {
        const fraction = Math.max(5, line.length) / totalChars;
        const lineSec = totalSec * fraction;
        const timeStr = formatTime(curSec);
        const item = {
            text: line,
            rawDuration: Math.round(lineSec * 100) / 100,
            scaledDuration: Math.round(lineSec * 100) / 100,
            seconds: Math.round(curSec * 100) / 100,
            timestamp: timeStr,
            formattedLine: `[${timeStr}] ${line}`
        };
        curSec += lineSec;
        return item;
    });
}

class TTSService {
    /**
     * Get list of all available voices (including custom Cloned voices)
     */
    static getAvailableVoices() {
        return VoiceManager.getAllVoices();
    }

    /**
     * Synthesize speech using high-definition Neural Voice Models (Edge / Azure / Google Fallback)
     * Pure audio quality - no unwanted pitch shift, no Hz alteration
     */
    static async synthesize({ text, voice, lang = 'en', rate = 1.0, azureKey, azureRegion }) {
        const cleanLines = splitScriptLines(text);
        if (cleanLines.length === 0) {
            throw new Error('Script text is empty or invalid.');
        }

        ensureDir(config.outputsDir);
        const fileName = `tts-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp3`;
        const outputPath = path.join(config.outputsDir, fileName);
        const vttPath = path.join(config.outputsDir, `tts-${Date.now()}-${Math.round(Math.random() * 1e6)}.vtt`);

        const speedRate = Math.max(0.5, Math.min(3.0, Number(rate) || 1.0));
        const targetLang = lang === 'km' ? 'km' : 'en';

        // Select suitable Neural voice if none specified or default requested
        let selectedVoice = voice;
        if (!selectedVoice || selectedVoice === 'default' || selectedVoice === 'km' || selectedVoice === 'en') {
            selectedVoice = (targetLang === 'km') ? 'km-KH-PisethNeural' : 'en-US-JennyNeural';
        }

        // Handle Cloned Voice selection seamlessly
        if (selectedVoice && selectedVoice.startsWith('cloned-')) {
            const CloneService = require('./clone.service');
            const clonedVoice = VoiceManager.getClonedVoices().find(v => v.id === selectedVoice);
            if (clonedVoice && clonedVoice.referenceAudioPath && fs.existsSync(clonedVoice.referenceAudioPath)) {
                return await CloneService.cloneAndSynthesize({
                    referenceAudioPath: clonedVoice.referenceAudioPath,
                    text,
                    voiceName: clonedVoice.name,
                    lang: targetLang,
                    existingVoiceId: clonedVoice.id
                });
            } else {
                console.warn(`Reference sample missing for cloned voice "${selectedVoice}". Falling back to default voice.`);
                selectedVoice = (targetLang === 'km') ? 'km-KH-PisethNeural' : 'en-US-JennyNeural';
            }
        }

        // Resolve specialized voice profile (Education, Documentary, Storyteller, Entertainment)
        const profile = KHMER_VOICE_PROFILES[selectedVoice];
        let baseVoice = profile ? profile.baseVoice : selectedVoice;
        if (!baseVoice || !baseVoice.includes('Neural')) {
            baseVoice = (targetLang === 'km') ? 'km-KH-PisethNeural' : 'en-US-JennyNeural';
        }
        const rateOffset = profile ? profile.rateOffset : (baseVoice.includes('Neural') && baseVoice.startsWith('km-') ? -15 : 0);
        const pitchStr = profile ? profile.pitch : '+0Hz';

        const ratePercent = Math.round((speedRate - 1.0) * 100) + rateOffset;
        const rateStr = (ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`);
        const fullScriptText = cleanLines.join('\n');

        const activeAzureKey = azureKey || process.env.AZURE_SPEECH_KEY;
        const activeAzureRegion = azureRegion || process.env.AZURE_SPEECH_REGION || 'eastus';

        // 1. Try Azure Speech if key is explicitly configured
        if (activeAzureKey && baseVoice.includes('Neural')) {
            try {
                const axios = require('axios');
                const ssml = `<speak version='1.0' xml:lang='${targetLang === 'km' ? 'km-KH' : 'en-US'}'><voice xml:lang='${targetLang === 'km' ? 'km-KH' : 'en-US'}' name='${baseVoice}'><prosody rate='${rateStr}' pitch='${pitchStr}'>${cleanLines.join(' ')}</prosody></voice></speak>`;

                const azureRes = await axios.post(
                    `https://${activeAzureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
                    ssml,
                    {
                        headers: {
                            'Ocp-Apim-Subscription-Key': activeAzureKey,
                            'Content-Type': 'application/ssml+xml',
                            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                            'User-Agent': 'VoxSync-AI'
                        },
                        responseType: 'arraybuffer'
                    }
                );

                const azureBuffer = Buffer.from(azureRes.data);
                fs.writeFileSync(outputPath, azureBuffer);

                const totalSec = Math.max(2, azureBuffer.length / 6000);
                const totalChars = cleanLines.reduce((acc, l) => acc + Math.max(5, l.length), 0) || 1;
                let curSec = 0;
                const timestamps = cleanLines.map((line) => {
                    const fraction = Math.max(5, line.length) / totalChars;
                    const lineSec = totalSec * fraction;
                    const timeStr = formatTime(curSec);
                    const item = {
                        text: line,
                        rawDuration: Math.round(lineSec * 100) / 100,
                        scaledDuration: Math.round(lineSec * 100) / 100,
                        seconds: Math.round(curSec * 100) / 100,
                        timestamp: timeStr,
                        formattedLine: `[${timeStr}] ${line}`
                    };
                    curSec += lineSec;
                    return item;
                });

                const audioBase64 = azureBuffer.toString('base64');
                return {
                    success: true,
                    audioUrl: `/storage/outputs/${fileName}`,
                    audioDataUri: `data:audio/mp3;base64,${audioBase64}`,
                    fileName,
                    duration: Math.round(totalSec * 100) / 100,
                    voice: selectedVoice,
                    lang: targetLang,
                    rate: speedRate,
                    rawLines: timestamps,
                    timestamps,
                    formattedText: timestamps.map(t => t.formattedLine).join('\n')
                };
            } catch (azureErr) {
                console.warn('Azure Speech unavailable, using Microsoft Edge Neural Engine:', azureErr.message);
            }
        }

        // 2. Primary 100% Free High-Definition Engine: Microsoft Edge Neural TTS
        try {
            await runEdgeTTS({
                text: fullScriptText,
                voice: baseVoice,
                rateStr,
                pitchStr,
                outputPath,
                vttPath
            });

            let vttContent = '';
            if (fs.existsSync(vttPath)) {
                vttContent = fs.readFileSync(vttPath, 'utf-8');
                try { fs.unlinkSync(vttPath); } catch (_) {}
            }

            const timestamps = parseVttTimestamps(vttContent, cleanLines);
            const audioBuffer = fs.readFileSync(outputPath);
            const audioBase64 = audioBuffer.toString('base64');

            const totalDuration = timestamps.length > 0
                ? Math.round((timestamps[timestamps.length - 1].seconds + timestamps[timestamps.length - 1].scaledDuration) * 10) / 10
                : Math.round((audioBuffer.length / 6000) * 10) / 10;

            return {
                success: true,
                audioUrl: `/storage/outputs/${fileName}`,
                audioDataUri: `data:audio/mp3;base64,${audioBase64}`,
                fileName,
                duration: Math.max(1, totalDuration),
                voice: selectedVoice,
                lang: targetLang,
                rate: speedRate,
                rawLines: timestamps,
                timestamps,
                formattedText: timestamps.map(t => t.formattedLine).join('\n')
            };
        } catch (edgeErr) {
            console.error('Neural TTS synthesis failed:', edgeErr.message);
            throw new Error(`Neural TTS synthesis failed: ${edgeErr.message}`);
        }
    }
}

module.exports = TTSService;
