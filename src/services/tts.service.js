const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');
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

    // 💼 អាជីវកម្ម, ទីផ្សារ & ហិរញ្ញវត្ថុ (Business, Finance & Commercial Series)
    'km-biz-entrepreneur': { baseVoice: 'km-KH-PisethNeural', rateOffset: -12, pitch: '-4Hz' },     // អ្នកជំនួញ & CEO (Confident Entrepreneur & Business Pitch)
    'km-biz-financial': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -15, pitch: '+4Hz' },       // ហិរញ្ញវត្ថុ & វិនិយោគ (Financial Analyst & Banking)
    'km-biz-advertisement': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -6, pitch: '+20Hz' },    // ផ្សាយពាណិជ្ជកម្មទំនើប (Trendy Product Commercial)

    // 📰 ព័ត៌មាន & ព្រឹត្តិការណ៍ (News, Broadcast & Politics Series)
    'km-news-anchor-m': { baseVoice: 'km-KH-PisethNeural', rateOffset: -14, pitch: '-8Hz' },        // ពិធីករព័ត៌មានទូរទស្សន៍បុរស (Prime Time TV News Anchor)
    'km-news-reporter-f': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -10, pitch: '+6Hz' },     // អ្នកយកព័ត៌មានបន្ទាន់ស្ត្រី (Breaking News Field Reporter)
    'km-news-sports': { baseVoice: 'km-KH-PisethNeural', rateOffset: -4, pitch: '+14Hz' },          // អ្នកអត្ថាធិប្បាយកីឡា & បាល់ទាត់ (High Energy Sports Commentator)

    // 🎬 សម្រាយរឿង (Recap & Storytelling Series)
    'km-recap-cinema': { baseVoice: 'km-KH-PisethNeural', rateOffset: -12, pitch: '-18Hz' },       // Movie Recap Pro (ភាពយន្ត)
    'km-recap-drama': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -10, pitch: '-8Hz' },        // Drama & Series Recap (រឿងភាគ)
    'km-recap-suspense': { baseVoice: 'km-KH-PisethNeural', rateOffset: -18, pitch: '-32Hz' },     // Suspense / Horror Recap (ភ័យរន្ធត់ & អាថ៌កំបាំង)

    // 🎧 សៀវភៅសំឡេង, ASMR & Podcast (Audiobook & Calming Audio Series)
    'km-audiobook-fantasy': { baseVoice: 'km-KH-PisethNeural', rateOffset: -24, pitch: '-22Hz' },  // និទានរឿងទេវកថា & រឿងព្រេងបុរាណ (Fantasy & Epic Legends)
    'km-radio-latenight': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -22, pitch: '-14Hz' },    // រាត្រីស្ងប់ស្ងាត់ Radio Host (Soothing Late Night Show)
    'km-asmr-whisper': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -26, pitch: '-25Hz' },       // សំឡេងខ្សឹបស្ងប់អារម្មណ៍ (Gentle ASMR & Sleep Whisper)

    // 🎮 ហ្គេម & បច្ចេកវិទ្យា (Gaming & Tech Series)
    'km-game-streamer': { baseVoice: 'km-KH-PisethNeural', rateOffset: -6, pitch: '+18Hz' },        // ម៉ាការ៉ា (Live Game Streamer)
    'km-tech-ai-bot': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -10, pitch: '+40Hz' },        // មេកា-AI (Futuristic Robot AI Assistant)
    'km-tech-it': { baseVoice: 'km-KH-PisethNeural', rateOffset: -15, pitch: '+2Hz' },               // កុសល (IT Engineer & Programmer)
    'km-radio-dj': { baseVoice: 'km-KH-PisethNeural', rateOffset: -8, pitch: '+12Hz' },              // សំនៀង (Radio FM & DJ Host)
    'km-story-kannika': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -20, pitch: '-6Hz' },       // កន្និកា (Audiobook & Novel Narrator)
    'km-mindful-dharma': { baseVoice: 'km-KH-PisethNeural', rateOffset: -28, pitch: '-18Hz' },      // ធម្មរតន៍ (Spiritual Meditation & Calm)
    'km-event-mc': { baseVoice: 'km-KH-PisethNeural', rateOffset: -6, pitch: '+22Hz' },              // សីហា (High Energy Event Host)

    // 🎭 សម្លេងតួអង្គ (Character & Roleplay Series)
    'km-char-elder-m': { baseVoice: 'km-KH-PisethNeural', rateOffset: -26, pitch: '-42Hz' },       // តាសុវណ្ណ / លោកតា (Elderly Grandfather)
    'km-char-elder-f': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -24, pitch: '-30Hz' },      // យាយម៉ៅ / លោកយាយ (Elderly Grandmother)
    'km-char-villain': { baseVoice: 'km-KH-PisethNeural', rateOffset: -20, pitch: '-50Hz' },       // ក្រុងរាពណ៍ / មេចោរ / បិសាច (Villain & Monster)
    'km-char-hero': { baseVoice: 'km-KH-PisethNeural', rateOffset: -10, pitch: '-6Hz' },           // កម្ពុជបុត្រ / តួឯកប្រុស (Brave Hero / Anime)
    'km-char-heroine': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -8, pitch: '+32Hz' },        // ទេពអប្សរ / តួឯកស្រី (Sweet Heroine / Princess)
    'km-char-detective': { baseVoice: 'km-KH-PisethNeural', rateOffset: -22, pitch: '-28Hz' },     // ស៊ើបការណ៍ (Noir Detective)
    'km-char-queen': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -18, pitch: '-6Hz' },          // សុវណ្ណរាជនី (Royal Majesty Queen)
    'km-char-ghost': { baseVoice: 'km-KH-PisethNeural', rateOffset: -30, pitch: '-48Hz' },          // វិញ្ញាណក្ខន្ធ (Creepy Ghost & Horror)

    // 🏥 សុខភាព & វេជ្ជសាស្ត្រ (Health, Medical & Wellness Series)
    'km-med-doctor-m': { baseVoice: 'km-KH-PisethNeural', rateOffset: -18, pitch: '-4Hz' },         // វេជ្ជបណ្ឌិត សុភា (Dr. Sothea)
    'km-med-nurse-f': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -16, pitch: '+6Hz' },          // គិលានុបដ្ឋាយិកា ម៉ាលី (Nurse Maly)
    'km-med-nutrition': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -14, pitch: '+12Hz' },       // អាហារូបត្ថម្ភ កុលាប (Nutritionist Kolab)

    // ✈️ ទេសចរណ៍ & វប្បធម៌ (Tourism, Culture & Travel Vlogs)
    'km-travel-guide-m': { baseVoice: 'km-KH-PisethNeural', rateOffset: -10, pitch: '+8Hz' },        // មគ្គុទ្ទេសក៍ សំអាត (Tour Guide Sam-At)
    'km-travel-vlogger-f': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -6, pitch: '+24Hz' },      // Vlogger នីកា (Travel Vlogger Nika)

    // 🍲 ម្ហូបអាហារ & ចុងភៅ (Culinary & Cooking Series)
    'km-food-chef-m': { baseVoice: 'km-KH-PisethNeural', rateOffset: -12, pitch: '+2Hz' },           // ចុងភៅ ហេង (Chef Heng)
    'km-food-reviewer-f': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -8, pitch: '+28Hz' },      // អ្នកភ្លក្ស ស្រីពៅ (Food Reviewer Sreypov)

    // 🚗 យានយន្ត & Gadget Review (Auto & Tech Reviews)
    'km-tech-automotive': { baseVoice: 'km-KH-PisethNeural', rateOffset: -10, pitch: '-6Hz' },        // អ្នកវិភាគរថយន្ត វណ្ណា (Car Reviewer Vanna)
    'km-tech-gadget': { baseVoice: 'km-KH-PisethNeural', rateOffset: -8, pitch: '+10Hz' },           // អ្នក Review បញ្ញា (Gadget Host Panha)

    // 🎭 សំឡេងតួអង្គប្រពៃណី & ទេវកថាបុរាណ (Classical Epic & Mythological Series)
    'km-char-king': { baseVoice: 'km-KH-PisethNeural', rateOffset: -22, pitch: '-36Hz' },           // ព្រះបាទជ័យវរ្ម័ន (King Jayavarman)
    'km-char-general-warrior': { baseVoice: 'km-KH-PisethNeural', rateOffset: -12, pitch: '-24Hz' }, // មេទ័ព ពិជ័យ (General Pichai)
    'km-char-sorcerer': { baseVoice: 'km-KH-PisethNeural', rateOffset: -26, pitch: '-38Hz' },        // គ្រូអាគម មុនីឥសី (Moni Esei)
    'km-char-ogre': { baseVoice: 'km-KH-PisethNeural', rateOffset: -24, pitch: '-55Hz' },            // យក្សពិភេក (Yak Piphek)
    'km-char-princess-fairy': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -14, pitch: '+38Hz' }, // ព្រះនាង កេសរបុប្ផា (Princess Kesar Bopha)

    // ☕ ជីវិត & ការលើកទឹកចិត្ត (Lifestyle & Soul Talk)
    'km-lifestyle-coffee': { baseVoice: 'km-KH-SreymomNeural', rateOffset: -16, pitch: '+0Hz' },     // កាហ្វេពេលព្រឹក សុជាតា (Morning Coffee Socheata)
    'km-lifestyle-monk': { baseVoice: 'km-KH-PisethNeural', rateOffset: -30, pitch: '-14Hz' },       // ធម្មកថិក (Dhamma Preacher)

    // 👶 សម្លេងក្មេង (Kids & Animation Series)
    'km-child-boy': { baseVoice: 'km-KH-SreymomNeural', rateOffset: +6, pitch: '+68Hz' },          // កុមារា ណាណូ (Little Boy Nano)
    'km-child-girl': { baseVoice: 'km-KH-SreymomNeural', rateOffset: +8, pitch: '+92Hz' },         // កុមារី មីមី (Little Girl Mimi)
    'km-child-cartoon': { baseVoice: 'km-KH-SreymomNeural', rateOffset: +12, pitch: '+120Hz' },     // អាទីតូច (Cute Baby & Cartoon)

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
        const tempTextPath = path.join(config.outputsDir, `temp-script-${Date.now()}-${Math.round(Math.random() * 1e6)}.txt`);
        fs.writeFileSync(tempTextPath, text, 'utf-8');

        const args = [
            '--voice', voice,
            `--rate=${rateStr}`,
            `--pitch=${pitchStr}`,
            '--file', tempTextPath,
            '--write-media', outputPath,
            '--write-subtitles', vttPath
        ];

        const cleanupTemp = () => {
            try { if (fs.existsSync(tempTextPath)) fs.unlinkSync(tempTextPath); } catch (_) {}
        };

        execFile('edge-tts', args, { windowsHide: true }, (err, stdout, stderr) => {
            if (!err) {
                cleanupTemp();
                return resolve();
            }

            // Fallback: Run via python -m edge_tts
            const pythonArgs = ['-m', 'edge_tts', ...args];
            execFile('python', pythonArgs, { windowsHide: true }, (pyErr, pyStdout, pyStderr) => {
                cleanupTemp();
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
            if (clonedVoice) {
                return await CloneService.cloneAndSynthesize({
                    referenceAudioPath: clonedVoice.referenceAudioPath,
                    savedAcoustic: clonedVoice.acoustic,
                    text,
                    voiceName: clonedVoice.name,
                    lang: targetLang,
                    existingVoiceId: clonedVoice.id,
                    rate: speedRate
                });
            } else {
                console.warn(`Cloned voice "${selectedVoice}" not found. Falling back to default voice.`);
                selectedVoice = (targetLang === 'km') ? 'km-KH-PisethNeural' : 'en-US-JennyNeural';
            }
        }

        // Handle Custom AI Tuned Voice selection seamlessly
        if (selectedVoice && selectedVoice.startsWith('custom-')) {
            const customVoice = VoiceManager.getCustomVoices().find(v => v.id === selectedVoice);
            if (customVoice && customVoice.config) {
                return await this.synthesizeCustomVoice({
                    text,
                    baseVoice: customVoice.config.baseVoice || 'km-KH-PisethNeural',
                    lang: customVoice.lang || targetLang,
                    rate: speedRate,
                    pitch: customVoice.config.pitch || 0,
                    formant: customVoice.config.formant || 1.0,
                    bass: customVoice.config.bass || 0,
                    mid: customVoice.config.mid || 0,
                    treble: customVoice.config.treble || 0,
                    compression: customVoice.config.compression || 'off',
                    reverb: customVoice.config.reverb || 'off'
                });
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

    /**
     * Synthesize Custom Acoustic Tuned AI Voice Model with Edge TTS + FFmpeg DSP Chain
     */
    static async synthesizeCustomVoice({
        text,
        baseVoice = 'km-KH-PisethNeural',
        lang = 'km',
        rate = 1.0,
        pitch = 0,
        formant = 1.0,
        bass = 0,
        mid = 0,
        treble = 0,
        compression = 'off',
        reverb = 'off'
    }) {
        const cleanLines = splitScriptLines(text);
        if (cleanLines.length === 0) {
            throw new Error('Script text is empty or invalid.');
        }

        ensureDir(config.outputsDir);
        const tempBaseName = `custom-raw-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp3`;
        const tempBasePath = path.join(config.outputsDir, tempBaseName);
        const vttPath = path.join(config.outputsDir, `custom-${Date.now()}-${Math.round(Math.random() * 1e6)}.vtt`);
        const finalFileName = `custom-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp3`;
        const finalOutputPath = path.join(config.outputsDir, finalFileName);

        const speedRate = Math.max(0.5, Math.min(2.5, Number(rate) || 1.0));
        let rateOffset = baseVoice.startsWith('km-') ? -15 : 0;
        let finalRatePct = Math.round((speedRate - 1.0) * 100) + rateOffset;
        const rateStr = `${finalRatePct >= 0 ? '+' : ''}${finalRatePct}%`;
        const pitchVal = Number(pitch) || 0;
        const pitchStr = `${pitchVal >= 0 ? '+' : ''}${pitchVal}Hz`;

        // 1. Synthesize base audio with Edge-TTS
        await runEdgeTTS({
            text: cleanLines.join('\n'),
            voice: baseVoice,
            rateStr,
            pitchStr,
            outputPath: tempBasePath,
            vttPath
        });

        let vttContent = '';
        if (fs.existsSync(vttPath)) {
            vttContent = fs.readFileSync(vttPath, 'utf-8');
            try { fs.unlinkSync(vttPath); } catch (_) {}
        }

        // 2. Build DSP Filter Graph
        const filters = [];
        const bassVal = Number(bass) || 0;
        const midVal = Number(mid) || 0;
        const trebleVal = Number(treble) || 0;
        const formantVal = Number(formant) || 1.0;

        // 3-Band Studio EQ
        if (bassVal !== 0) {
            filters.push(`equalizer=f=150:width_type=q:w=1.0:g=${bassVal}`);
        }
        if (midVal !== 0) {
            filters.push(`equalizer=f=2500:width_type=q:w=1.0:g=${midVal}`);
        }
        if (trebleVal !== 0) {
            filters.push(`equalizer=f=8000:width_type=q:w=1.0:g=${trebleVal}`);
        }

        // Formant Shift Modulation
        if (formantVal !== 1.0 && formantVal >= 0.5 && formantVal <= 2.2) {
            const sampleRate = Math.round(24000 * formantVal);
            const invRate = (1.0 / formantVal).toFixed(4);
            filters.push(`asetrate=${sampleRate},atempo=${invRate}`);
        }

        // Dynamic Compression
        if (compression === 'light') {
            filters.push('acompressor=threshold=-12dB:ratio=2:attack=20:release=200');
        } else if (compression === 'medium') {
            filters.push('acompressor=threshold=-16dB:ratio=3.5:attack=15:release=200');
        } else if (compression === 'radio' || compression === 'strong') {
            filters.push('acompressor=threshold=-20dB:ratio=5:attack=10:release=150,volume=1.35');
        }

        // Reverb / Ambience
        if (reverb === 'booth') {
            filters.push('aecho=0.8:0.7:20:0.25');
        } else if (reverb === 'room') {
            filters.push('aecho=0.8:0.8:35:0.35');
        } else if (reverb === 'hall') {
            filters.push('aecho=0.8:0.85:60:0.45');
        }

        // 3. Apply FFmpeg DSP or move file
        if (filters.length > 0) {
            await new Promise((resolve, reject) => {
                execFile(ffmpeg, [
                    '-y',
                    '-i', path.resolve(tempBasePath),
                    '-af', filters.join(','),
                    '-ar', '24000',
                    '-b:a', '128k',
                    path.resolve(finalOutputPath)
                ], (err) => {
                    try { fs.unlinkSync(tempBasePath); } catch (_) {}
                    if (err) return reject(err);
                    resolve();
                });
            });
        } else {
            if (fs.existsSync(tempBasePath)) {
                fs.renameSync(tempBasePath, finalOutputPath);
            }
        }

        const timestamps = parseVttTimestamps(vttContent, cleanLines);
        const audioBuffer = fs.readFileSync(finalOutputPath);
        const audioBase64 = audioBuffer.toString('base64');
        const totalDuration = timestamps.length > 0
            ? Math.round((timestamps[timestamps.length - 1].seconds + timestamps[timestamps.length - 1].scaledDuration) * 10) / 10
            : Math.round((audioBuffer.length / 6000) * 10) / 10;

        return {
            success: true,
            audioUrl: `/storage/outputs/${finalFileName}`,
            audioDataUri: `data:audio/mp3;base64,${audioBase64}`,
            fileName: finalFileName,
            duration: Math.max(1, totalDuration),
            voice: baseVoice,
            lang,
            rate: speedRate,
            rawLines: timestamps,
            timestamps,
            formattedText: timestamps.map(t => t.formattedLine).join('\n')
        };
    }
}

module.exports = TTSService;
