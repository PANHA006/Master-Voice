const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { ensureDir } = require('../utils/audio.util');

const CLONED_VOICES_FILE = path.join(__dirname, '../../storage/cloned-voices.json');

class VoiceManager {
    static getClonedVoices() {
        try {
            ensureDir(path.dirname(CLONED_VOICES_FILE));
            if (fs.existsSync(CLONED_VOICES_FILE)) {
                const data = fs.readFileSync(CLONED_VOICES_FILE, 'utf-8');
                return JSON.parse(data) || [];
            }
        } catch (e) {
            console.error('Error reading cloned voices:', e.message);
        }
        return [];
    }

    static saveClonedVoice(voice) {
        try {
            ensureDir(path.dirname(CLONED_VOICES_FILE));
            const list = this.getClonedVoices();
            // Check if voice with same id or same name already exists
            const existingIndex = list.findIndex(v => v.id === voice.id || (voice.name && v.name === voice.name));
            if (existingIndex >= 0) {
                list[existingIndex] = voice;
            } else {
                list.unshift(voice);
            }
            fs.writeFileSync(CLONED_VOICES_FILE, JSON.stringify(list, null, 2), 'utf-8');
            return true;
        } catch (e) {
            console.error('Error saving cloned voice:', e.message);
            return false;
        }
    }

    static deleteClonedVoice(id) {
        try {
            ensureDir(path.dirname(CLONED_VOICES_FILE));
            let list = this.getClonedVoices();
            const originalLength = list.length;
            list = list.filter(v => v.id !== id);
            fs.writeFileSync(CLONED_VOICES_FILE, JSON.stringify(list, null, 2), 'utf-8');
            return list.length < originalLength;
        } catch (e) {
            console.error('Error deleting cloned voice:', e.message);
            return false;
        }
    }

    static clearAllClonedVoices() {
        try {
            ensureDir(path.dirname(CLONED_VOICES_FILE));
            fs.writeFileSync(CLONED_VOICES_FILE, JSON.stringify([], null, 2), 'utf-8');
            return true;
        } catch (e) {
            console.error('Error clearing cloned voices:', e.message);
            return false;
        }
    }

    static getAllVoices() {
        const cloned = this.getClonedVoices();
        
        const standardVoices = {
            km: [
                // 📚 វីដេអូអប់រំ & ចំណេះដឹង (Education & Knowledge Series)
                { id: 'km-edu-professor', name: '👨‍🏫 សាស្ត្រាចារ្យ & បាឋកថា (Academic Professor - Piseth)', gender: 'Male', lang: 'km', category: 'Education' },
                { id: 'km-edu-explainer', name: '💡 ពន្យល់ចំណេះដឹង & បច្ចេកវិទ្យា (Tech & Knowledge Explainer - Piseth)', gender: 'Male', lang: 'km', category: 'Education' },
                { id: 'km-edu-history', name: '📜 ប្រវត្តិសាស្ត្រ & អក្សរសាស្ត្រ (History & Culture - Piseth)', gender: 'Male', lang: 'km', category: 'Education' },
                { id: 'km-edu-motivation', name: '🌟 ការលើកទឹកចិត្ត & អភិវឌ្ឍខ្លួន (Motivation & Self-Growth - Piseth)', gender: 'Male', lang: 'km', category: 'Education' },
                { id: 'km-edu-instructor', name: '👩‍🏫 គ្រូបង្រៀនស្ត្រី E-learning (Female Course Instructor - Sreymom)', gender: 'Female', lang: 'km', category: 'Education' },
                { id: 'km-edu-kids-teacher', name: '🎨 អ្នកគ្រូបង្រៀនកុមារ / មត្តេយ្យ (Kindergarten & Primary Teacher - Sreymom)', gender: 'Female', lang: 'km', category: 'Education' },
                { id: 'km-edu-documentary-f', name: '🌍 ធម្មជាតិ វិទ្យាសាស្ត្រ & ភូមិសាស្ត្រ (Nature & Geo Explainer - Sreymom)', gender: 'Female', lang: 'km', category: 'Education' },
                { id: 'km-edu-mindfulness', name: '🧘‍♀️ សតិអារម្មណ៍ & សុខភាពផ្លូវចិត្ត (Mindfulness & Mental Health - Sreymom)', gender: 'Female', lang: 'km', category: 'Education' },

                // 🎬 សម្រាយរឿង (Recap & Storytelling Series)
                { id: 'km-recap-cinema', name: '🎬 សម្រាយរឿង - បែបភាពយន្ត (Movie Recap Pro - Piseth)', gender: 'Male', lang: 'km', category: 'Recap' },
                { id: 'km-recap-drama', name: '🍿 សម្រាយរឿង - បែប Drama & រឿងភាគ (Drama Recap - Sreymom)', gender: 'Female', lang: 'km', category: 'Recap' },
                { id: 'km-recap-suspense', name: '🔥 សម្រាយរឿង - បែបភ័យរន្ធត់ & អាថ៌កំបាំង (Suspense & Thriller - Piseth)', gender: 'Male', lang: 'km', category: 'Recap' },

                // 🎭 សម្លេងតួអង្គ (Character & Roleplay Series)
                { id: 'km-char-elder-m', name: '👴 តួអង្គតាចាស់ / លោកតា (Grandfather)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-elder-f', name: '👵 តួអង្គយាយចាស់ / លោកយាយ (Grandmother)', gender: 'Female', lang: 'km', category: 'Character' },
                { id: 'km-char-villain', name: '😈 តួអង្គកាច / មេចោរ / បិសាច (Villain & Monster)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-hero', name: '🦸 តួអង្គវីរបុរស / តួឯកប្រុស (Brave Hero / Anime Male)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-heroine', name: '🧚‍♀️ តួអង្គនារីក្លាហាន / ទេពអប្សរ (Sweet Heroine / Princess)', gender: 'Female', lang: 'km', category: 'Character' },

                // 👶 សម្លេងក្មេង (Kids & Animation Series)
                { id: 'km-child-boy', name: '👦 សម្លេងកុមារា (Little Boy Voice)', gender: 'Child', lang: 'km', category: 'Kids' },
                { id: 'km-child-girl', name: '👧 សម្លេងកុមារី (Little Girl Voice)', gender: 'Child', lang: 'km', category: 'Kids' },
                { id: 'km-child-cartoon', name: '🐣 សម្លេងកូនក្មេងគំនូរជីវចល (Cute Baby & Cartoon)', gender: 'Child', lang: 'km', category: 'Kids' },

                // 👨 Piseth Series (សំឡេងបុរសទូទៅ)
                { id: 'km-KH-PisethNeural', name: '🇰🇭 Piseth (ពិសិដ្ឋ - Standard Male Neural)', gender: 'Male', lang: 'km', category: 'General' },
                { id: 'km-piseth-edu', name: '👨‍🏫 Piseth (ពិសិដ្ឋ - Education & Teacher)', gender: 'Male', lang: 'km', category: 'Education' },
                { id: 'km-piseth-doc', name: '🎥 Piseth (ពិសិដ្ឋ - Documentary & Film Narrator)', gender: 'Male', lang: 'km', category: 'Documentary' },
                { id: 'km-piseth-story', name: '🎙️ Piseth (ពិសិដ្ឋ - Podcast & Storyteller)', gender: 'Male', lang: 'km', category: 'Storytelling' },
                { id: 'km-piseth-promo', name: '⚡ Piseth (ពិសិដ្ឋ - Commercial & Promo)', gender: 'Male', lang: 'km', category: 'Entertainment' },

                // 👩 Sreymom Series (សំឡេងស្ត្រីទូទៅ)
                { id: 'km-KH-SreymomNeural', name: '🇰🇭 Sreymom (ស្រីមុំ - Standard Female Neural)', gender: 'Female', lang: 'km', category: 'General' },
                { id: 'km-sreymom-edu', name: '👩‍🏫 Sreymom (ស្រីមុំ - Education & Explainer)', gender: 'Female', lang: 'km', category: 'Education' },
                { id: 'km-sreymom-story', name: '📖 Sreymom (ស្រីមុំ - Storyteller & Audio Book)', gender: 'Female', lang: 'km', category: 'Storytelling' },
                { id: 'km-sreymom-news', name: '📺 Sreymom (ស្រីមុំ - News & Formal Presentation)', gender: 'Female', lang: 'km', category: 'News' },
                { id: 'km-sreymom-fun', name: '🌸 Sreymom (ស្រីមុំ - Entertainment & Commercial)', gender: 'Female', lang: 'km', category: 'Entertainment' }
            ],
            en: [
                { id: 'en-US-JennyNeural', name: '🇺🇸 Jenny (Natural Female)', gender: 'Female', lang: 'en' },
                { id: 'en-US-GuyNeural', name: '🇺🇸 Guy (Natural Male)', gender: 'Male', lang: 'en' },
                { id: 'en-US-AriaNeural', name: '🇺🇸 Aria (Expressive Female)', gender: 'Female', lang: 'en' },
                { id: 'en-US-ChristopherNeural', name: '🇺🇸 Christopher (Conversational Male)', gender: 'Male', lang: 'en' },
                { id: 'en-US-EricNeural', name: '🇺🇸 Eric (Smooth Male)', gender: 'Male', lang: 'en' },
                { id: 'en-US-AnaNeural', name: '🇺🇸 Ana (Young Female)', gender: 'Female', lang: 'en' },
                { id: 'en-GB-SoniaNeural', name: '🇬🇧 Sonia (British Female)', gender: 'Female', lang: 'en' },
                { id: 'en-GB-RyanNeural', name: '🇬🇧 Ryan (British Male)', gender: 'Male', lang: 'en' },
                { id: 'en-AU-NatashaNeural', name: '🇦🇺 Natasha (Australian Female)', gender: 'Female', lang: 'en' },
                { id: 'en-AU-WilliamNeural', name: '🇦🇺 William (Australian Male)', gender: 'Male', lang: 'en' }
            ]
        };

        // Inject cloned voices into matching language
        cloned.forEach(v => {
            const lang = v.lang || 'en';
            if (!standardVoices[lang]) standardVoices[lang] = [];
            standardVoices[lang].unshift({
                id: v.id,
                name: `✨ ${v.name} (Cloned Voice)`,
                gender: 'Cloned',
                lang: v.lang,
                isCloned: true,
                referenceAudioPath: v.referenceAudioPath
            });
        });

        return standardVoices;
    }
}

module.exports = VoiceManager;
