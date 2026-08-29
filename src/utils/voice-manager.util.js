const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { ensureDir } = require('../utils/audio.util');

const CLONED_VOICES_FILE = path.join(__dirname, '../../storage/cloned-voices.json');
const CUSTOM_VOICES_FILE = path.join(__dirname, '../../storage/custom-voices.json');
const PREFERENCES_FILE = path.join(__dirname, '../../storage/voice-preferences.json');

class VoiceManager {
    static getPreferences() {
        try {
            ensureDir(path.dirname(PREFERENCES_FILE));
            if (fs.existsSync(PREFERENCES_FILE)) {
                const data = fs.readFileSync(PREFERENCES_FILE, 'utf-8');
                return JSON.parse(data) || { favorites: [], activeVoices: [] };
            }
        } catch (e) {
            console.error('Error reading voice preferences:', e.message);
        }
        return {
            favorites: [
                "cloned-1787562721953",
                "cloned-1787566066619",
                "custom-1787646217612-2750",
                "custom-1787646477696-1220",
                "custom-1787646632200-8452"
            ],
            activeVoices: [
                "cloned-1787562721953",
                "cloned-1787566066619",
                "cloned-1787973055454",
                "custom-1787646217612-2750",
                "custom-1787646477696-1220",
                "custom-1787646632200-8452",
                "custom-1787645811135-4009",
                "km-KH-PisethNeural",
                "km-KH-SreymomNeural",
                "en-US-JennyNeural",
                "en-US-GuyNeural"
            ]
        };
    }

    static savePreferences(prefs = {}) {
        try {
            ensureDir(path.dirname(PREFERENCES_FILE));
            const existing = this.getPreferences();
            const updated = {
                favorites: Array.isArray(prefs.favorites) ? prefs.favorites : existing.favorites,
                activeVoices: Array.isArray(prefs.activeVoices) ? prefs.activeVoices : existing.activeVoices
            };
            fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
            return true;
        } catch (e) {
            console.error('Error saving voice preferences:', e.message);
            return false;
        }
    }
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

    /* Custom AI Tuned Voice Models Management */
    static getCustomVoices() {
        try {
            ensureDir(path.dirname(CUSTOM_VOICES_FILE));
            if (fs.existsSync(CUSTOM_VOICES_FILE)) {
                const data = fs.readFileSync(CUSTOM_VOICES_FILE, 'utf-8');
                return JSON.parse(data) || [];
            }
        } catch (e) {
            console.error('Error reading custom voices:', e.message);
        }
        return [];
    }

    static saveCustomVoice(voice) {
        try {
            ensureDir(path.dirname(CUSTOM_VOICES_FILE));
            const list = this.getCustomVoices();
            const existingIndex = list.findIndex(v => v.id === voice.id);
            if (existingIndex >= 0) {
                list[existingIndex] = voice;
            } else {
                list.unshift(voice);
            }
            fs.writeFileSync(CUSTOM_VOICES_FILE, JSON.stringify(list, null, 2), 'utf-8');
            return true;
        } catch (e) {
            console.error('Error saving custom voice:', e.message);
            return false;
        }
    }

    static deleteCustomVoice(id) {
        try {
            ensureDir(path.dirname(CUSTOM_VOICES_FILE));
            let list = this.getCustomVoices();
            const originalLength = list.length;
            list = list.filter(v => v.id !== id);
            fs.writeFileSync(CUSTOM_VOICES_FILE, JSON.stringify(list, null, 2), 'utf-8');
            return list.length < originalLength;
        } catch (e) {
            console.error('Error deleting custom voice:', e.message);
            return false;
        }
    }

    static getAllVoices() {
        const cloned = this.getClonedVoices();
        const custom = this.getCustomVoices();
        
        const standardVoices = {
            km: [
                // 📚 វីដេអូអប់រំ & ចំណេះដឹង (Education & Knowledge Series)
                { id: 'km-edu-professor', name: '👨‍🏫 សុខា (Sokha - សាស្ត្រាចារ្យ & បាឋកថា)', gender: 'Male', lang: 'km', category: 'Education' },
                { id: 'km-edu-explainer', name: '💡 វិសាល (Visal - ពន្យល់ចំណេះដឹង & IT)', gender: 'Male', lang: 'km', category: 'Education' },
                { id: 'km-edu-history', name: '📜 បូរ៉ា (Bora - ប្រវត្តិសាស្ត្រ & វប្បធម៌)', gender: 'Male', lang: 'km', category: 'Education' },
                { id: 'km-edu-motivation', name: '🌟 រិទ្ធី (Rithy - ការលើកទឹកចិត្ត & អភិវឌ្ឍខ្លួន)', gender: 'Male', lang: 'km', category: 'Education' },
                { id: 'km-edu-instructor', name: '👩‍🏫 ចិន្តា (Chenda - គ្រូបង្រៀនស្ត្រី E-learning)', gender: 'Female', lang: 'km', category: 'Education' },
                { id: 'km-edu-kids-teacher', name: '🎨 បុប្ផា (Bopha - អ្នកគ្រូបង្រៀនកុមារ & មត្តេយ្យ)', gender: 'Female', lang: 'km', category: 'Education' },
                { id: 'km-edu-documentary-f', name: '🌍 វត្តី (Vattey - ធម្មជាតិ វិទ្យាសាស្ត្រ & ភូមិសាស្ត្រ)', gender: 'Female', lang: 'km', category: 'Education' },
                { id: 'km-edu-mindfulness', name: '🧘‍♀️ កល្យាណ (Kalyan - សតិអារម្មណ៍ & សុខភាពចិត្ត)', gender: 'Female', lang: 'km', category: 'Education' },

                // 💼 អាជីវកម្ម & ទីផ្សារ (Business, Finance & Commercial Series)
                { id: 'km-biz-entrepreneur', name: '💼 សម្បត្តិ (Sambath - អ្នកជំនួញ & CEO)', gender: 'Male', lang: 'km', category: 'Business' },
                { id: 'km-biz-financial', name: '📊 ធីតា (Thida - ហិរញ្ញវត្ថុ & វិនិយោគ)', gender: 'Female', lang: 'km', category: 'Business' },
                { id: 'km-biz-advertisement', name: '🛍️ រចនា (Rachana - ផ្សាយពាណិជ្ជកម្មទំនើប)', gender: 'Female', lang: 'km', category: 'Business' },

                // 📰 ព័ត៌មាន & ព្រឹត្តិការណ៍ (News, Broadcast & Sports Series)
                { id: 'km-news-anchor-m', name: '🎙️ សុភ័ក្ត្រ (Sopheak - ពិធីករព័ត៌មានទូរទស្សន៍)', gender: 'Male', lang: 'km', category: 'News' },
                { id: 'km-news-reporter-f', name: '📹 ពិសី (Pisey - អ្នកយកព័ត៌មានបន្ទាន់)', gender: 'Female', lang: 'km', category: 'News' },
                { id: 'km-news-sports', name: '⚽ តារា (Dara - អ្នកអត្ថាធិប្បាយកីឡា & បាល់ទាត់)', gender: 'Male', lang: 'km', category: 'News' },

                // 🎬 សម្រាយរឿង (Recap & Storytelling Series)
                { id: 'km-recap-cinema', name: '🎬 វាសនា (Veasna - សម្រាយរឿងភាពយន្ត Cinema)', gender: 'Male', lang: 'km', category: 'Recap' },
                { id: 'km-recap-drama', name: '🍿 ទេវី (Devi - សម្រាយរឿង Drama & រឿងភាគ)', gender: 'Female', lang: 'km', category: 'Recap' },
                { id: 'km-recap-suspense', name: '🔥 គ្រីស្នា (Krishna - សម្រាយរឿងភ័យរន្ធត់ & អាថ៌កំបាំង)', gender: 'Male', lang: 'km', category: 'Recap' },

                // 🎧 សៀវភៅសំឡេង, ASMR & Podcast (Audiobook & Calming Audio Series)
                { id: 'km-audiobook-fantasy', name: '🏰 មុនី (Moni - និទានរឿងទេវកថា & រឿងព្រេង)', gender: 'Male', lang: 'km', category: 'Storytelling' },
                { id: 'km-radio-latenight', name: '🌙 ចន្ទ្រា (Chantrea - រាត្រីស្ងប់ស្ងាត់ Radio Host)', gender: 'Female', lang: 'km', category: 'Storytelling' },
                { id: 'km-asmr-whisper', name: '🍃 សុវណ្ណារី (Sovannary - សំឡេងខ្សឹប ASMR & ដំណេក)', gender: 'Female', lang: 'km', category: 'Storytelling' },
                { id: 'km-story-kannika', name: '📚 កន្និកា (Kannika - អានសៀវភៅអប់រំ & ប្រលោមលោក)', gender: 'Female', lang: 'km', category: 'Storytelling' },
                { id: 'km-mindful-dharma', name: '🧘‍♂️ ធម្មរតន៍ (Dhammaratan - សមាធិ & ធម៌អប់រំចិត្ត)', gender: 'Male', lang: 'km', category: 'Storytelling' },

                // 🎮 ហ្គេម & បច្ចេកវិទ្យា (Gaming & Tech Series)
                { id: 'km-game-streamer', name: '🎮 ម៉ាការ៉ា (Makara - Live Game Streamer)', gender: 'Male', lang: 'km', category: 'Entertainment' },
                { id: 'km-tech-ai-bot', name: '🤖 មេកា (Meka-AI - មនុស្សយន្តឆ្លាតវៃ)', gender: 'Female', lang: 'km', category: 'Entertainment' },
                { id: 'km-tech-it', name: '👨‍💻 កុសល (Kosal - អ្នកជំនាញបច្ចេកវិទ្យា & IT)', gender: 'Male', lang: 'km', category: 'Entertainment' },
                { id: 'km-radio-dj', name: '🎧 សំនៀង (Samneang - ពិធីករវិទ្យុ FM & DJ)', gender: 'Male', lang: 'km', category: 'Entertainment' },
                { id: 'km-event-mc', name: '⚡ សីហា (Seyha - ពិធីករ Event & MC)', gender: 'Male', lang: 'km', category: 'Entertainment' },

                // 🎭 សម្លេងតួអង្គ (Character & Roleplay Series)
                { id: 'km-char-elder-m', name: '👴 តាសុវណ្ណ (Ta Sovann - លោកតា)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-elder-f', name: '👵 យាយម៉ៅ (Yeay Mao - លោកយាយ)', gender: 'Female', lang: 'km', category: 'Character' },
                { id: 'km-char-villain', name: '😈 ក្រុងរាពណ៍ (Ravana - មេចោរ / បិសាច)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-hero', name: '🦸 កម្ពុជបុត្រ (Kambujabot - វីរបុរស / តួឯកប្រុស)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-heroine', name: '🧚‍♀️ ទេពអប្សរ (Tep Apsara - នារីក្លាហាន / ទេពធីតា)', gender: 'Female', lang: 'km', category: 'Character' },
                { id: 'km-char-detective', name: '🕵️ ស៊ើបការណ៍ (Soeub Kar - អ្នកស៊ើបអង្កេត)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-queen', name: '👑 សុវណ្ណរាជនី (Sovann Rajini - ព្រះមហាក្សត្រិយានី)', gender: 'Female', lang: 'km', category: 'Character' },
                { id: 'km-char-ghost', name: '👻 វិញ្ញាណក្ខន្ធ (Ghost Whisper - ខ្មោចព្រាយបិសាច)', gender: 'Male', lang: 'km', category: 'Character' },

                // 🏥 សុខភាព & វេជ្ជសាស្ត្រ (Health, Medical & Wellness Series)
                { id: 'km-med-doctor-m', name: '👨‍⚕️ វេជ្ជបណ្ឌិត សុភា (Dr. Sothea - វេជ្ជបណ្ឌិតបុរស)', gender: 'Male', lang: 'km', category: 'Health' },
                { id: 'km-med-nurse-f', name: '👩‍⚕️ គិលានុបដ្ឋាយិកា ម៉ាលី (Nurse Maly - គិលានុបដ្ឋាយិកាស្រទន់)', gender: 'Female', lang: 'km', category: 'Health' },
                { id: 'km-med-nutrition', name: '🥗 កុលាប (Kolab - អ្នកជំនាញអាហារ & សុខភាព)', gender: 'Female', lang: 'km', category: 'Health' },

                // ✈️ ទេសចរណ៍ & វប្បធម៌ (Tourism, Culture & Travel Vlogs)
                { id: 'km-travel-guide-m', name: '🗺️ សំអាត (Sam-At - មគ្គុទ្ទេសក៍ទេសចរណ៍)', gender: 'Male', lang: 'km', category: 'Travel' },
                { id: 'km-travel-vlogger-f', name: '🎒 នីកា (Nika - Travel & Lifestyle Vlogger)', gender: 'Female', lang: 'km', category: 'Travel' },

                // 🍲 ម្ហូបអាហារ & ចុងភៅ (Culinary & Cooking Series)
                { id: 'km-food-chef-m', name: '👨‍🍳 ចុងភៅ ហេង (Chef Heng - រៀបរាប់វិធីធ្វើម្ហូប)', gender: 'Male', lang: 'km', category: 'Food' },
                { id: 'km-food-reviewer-f', name: '🍜 ស្រីពៅ (Sreypov - Street Food Reviewer)', gender: 'Female', lang: 'km', category: 'Food' },

                // 🚗 យានយន្ត & Gadget Review (Auto & Tech Reviews)
                { id: 'km-tech-automotive', name: '🏎️ វណ្ណា (Vanna - អ្នកវិភាគរថយន្ត & យានយន្ត)', gender: 'Male', lang: 'km', category: 'Entertainment' },
                { id: 'km-tech-gadget', name: '📱 បញ្ញា (Panha - Smartphone & Gadget Host)', gender: 'Male', lang: 'km', category: 'Entertainment' },

                // 🎭 សំឡេងតួអង្គប្រពៃណី & ទេវកថាបុរាណ (Classical Epic & Mythological Series)
                { id: 'km-char-king', name: '👑 ព្រះបាទជ័យវរ្ម័ន (King Jayavarman - ព្រះមហាក្សត្រ)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-general-warrior', name: '⚔️ មេទ័ព ពិជ័យ (General Pichai - មេទ័ពខ្លាំងពូកែ)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-sorcerer', name: '🧙‍♂️ គ្រូអាគម មុនីឥសី (Moni Esei - តាឥសី / គ្រូអាគម)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-ogre', name: '👹 យក្សពិភេក (Yak Piphek - យក្សធំកាចសាហាវ)', gender: 'Male', lang: 'km', category: 'Character' },
                { id: 'km-char-princess-fairy', name: '🌺 ព្រះនាង កេសរបុប្ផា (Princess Kesar Bopha)', gender: 'Female', lang: 'km', category: 'Character' },

                // ☕ ជីវិត & ការលើកទឹកចិត្ត (Lifestyle & Soul Talk)
                { id: 'km-lifestyle-coffee', name: '☕ សុជាតា (Socheata - កាហ្វេពេលព្រឹក & ជជែកកម្សាន្ត)', gender: 'Female', lang: 'km', category: 'Storytelling' },
                { id: 'km-lifestyle-monk', name: '🧘‍♂️ ធម្មកថិក (Dhamma Preacher - ព្រះសង្ឃទេសនាស្ងប់ជ្រៅ)', gender: 'Male', lang: 'km', category: 'Storytelling' },

                // 👶 សម្លេងក្មេង (Kids & Animation Series)
                { id: 'km-child-boy', name: '👦 កុមារា ណាណូ (Little Boy Nano)', gender: 'Child', lang: 'km', category: 'Kids' },
                { id: 'km-child-girl', name: '👧 កុមារី មីមី (Little Girl Mimi)', gender: 'Child', lang: 'km', category: 'Kids' },
                { id: 'km-child-cartoon', name: '🐣 អាទីតូច (Cute Baby A-Ti)', gender: 'Child', lang: 'km', category: 'Kids' },

                // 🇰🇭 សំឡេងគោល Piseth & Sreymom Standard
                { id: 'km-KH-PisethNeural', name: '🇰🇭 ពិសិដ្ឋ (Piseth - Standard Male Neural)', gender: 'Male', lang: 'km', category: 'General' },
                { id: 'km-KH-SreymomNeural', name: '🇰🇭 ស្រីមុំ (Sreymom - Standard Female Neural)', gender: 'Female', lang: 'km', category: 'General' }
            ],
            en: [
                // 🇺🇸 English (US)
                { id: 'en-US-JennyNeural', name: '🇺🇸 Jenny (Natural Female)', gender: 'Female', lang: 'en', category: 'English' },
                { id: 'en-US-GuyNeural', name: '🇺🇸 Guy (Natural Male)', gender: 'Male', lang: 'en', category: 'English' },
                { id: 'en-US-AriaNeural', name: '🇺🇸 Aria (Expressive Female)', gender: 'Female', lang: 'en', category: 'English' },
                { id: 'en-US-ChristopherNeural', name: '🇺🇸 Christopher (Conversational Male)', gender: 'Male', lang: 'en', category: 'English' },
                { id: 'en-US-EricNeural', name: '🇺🇸 Eric (Smooth Male)', gender: 'Male', lang: 'en', category: 'English' },
                { id: 'en-US-AnaNeural', name: '🇺🇸 Ana (Young Female)', gender: 'Female', lang: 'en', category: 'English' },
                
                // 🇬🇧 British English (UK)
                { id: 'en-GB-SoniaNeural', name: '🇬🇧 Sonia (British Female)', gender: 'Female', lang: 'en', category: 'English' },
                { id: 'en-GB-RyanNeural', name: '🇬🇧 Ryan (British Male)', gender: 'Male', lang: 'en', category: 'English' },
                
                // 🇦🇺 Australian English (AU)
                { id: 'en-AU-NatashaNeural', name: '🇦🇺 Natasha (Australian Female)', gender: 'Female', lang: 'en', category: 'English' },
                { id: 'en-AU-WilliamNeural', name: '🇦🇺 William (Australian Male)', gender: 'Male', lang: 'en', category: 'English' },

                // 🇯🇵 Japanese
                { id: 'ja-JP-NanamiNeural', name: '🇯🇵 Nanami (Japanese Female)', gender: 'Female', lang: 'ja', category: 'International' },
                { id: 'ja-JP-KeitaNeural', name: '🇯🇵 Keita (Japanese Anime Male)', gender: 'Male', lang: 'ja', category: 'International' },

                // 🇰🇷 Korean
                { id: 'ko-KR-SunHiNeural', name: '🇰🇷 SunHi (Korean Drama Female)', gender: 'Female', lang: 'ko', category: 'International' },
                { id: 'ko-KR-InJoonNeural', name: '🇰🇷 InJoon (Korean Male)', gender: 'Male', lang: 'ko', category: 'International' },

                // 🇨🇳 Chinese Mandarin
                { id: 'zh-CN-XiaoxiaoNeural', name: '🇨🇳 Xiaoxiao (Chinese Female)', gender: 'Female', lang: 'zh', category: 'International' },
                { id: 'zh-CN-YunxiNeural', name: '🇨🇳 Yunxi (Chinese Film Male)', gender: 'Male', lang: 'zh', category: 'International' },

                // 🇹🇭 Thai
                { id: 'th-TH-PremwadeeNeural', name: '🇹🇭 Premwadee (Thai Female)', gender: 'Female', lang: 'th', category: 'International' },
                { id: 'th-TH-NiwatNeural', name: '🇹🇭 Niwat (Thai Male)', gender: 'Male', lang: 'th', category: 'International' },

                // 🇫🇷 French
                { id: 'fr-FR-DeniseNeural', name: '🇫🇷 Denise (French Female)', gender: 'Female', lang: 'fr', category: 'International' },

                // 🇪🇸 Spanish
                { id: 'es-ES-ElviraNeural', name: '🇪🇸 Elvira (Spanish Female)', gender: 'Female', lang: 'es', category: 'International' },

                // 🇩🇪 German
                { id: 'de-DE-KatjaNeural', name: '🇩🇪 Katja (German Female)', gender: 'Female', lang: 'de', category: 'International' }
            ]
        };

        // Inject custom AI tuned models into matching language
        custom.forEach(v => {
            const lang = v.lang || 'km';
            if (!standardVoices[lang]) standardVoices[lang] = [];
            standardVoices[lang].unshift({
                id: v.id,
                name: `🎛️ ${v.name} (Custom AI Model)`,
                gender: v.gender || 'Custom',
                lang: v.lang || 'km',
                category: 'Custom',
                isCustom: true,
                config: {
                    baseVoice: v.baseVoice,
                    pitch: v.pitch,
                    formant: v.formant,
                    bass: v.bass,
                    mid: v.mid,
                    treble: v.treble,
                    compression: v.compression,
                    reverb: v.reverb
                }
            });
        });

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
