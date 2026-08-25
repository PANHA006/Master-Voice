/**
 * VoxSync AI Studio - Test Voice Module (Modern Pro Studio Redesign with Favorites & Dynamic TTS Integration)
 * Allows users to preview, test, listen to all available voice models, and save favorite models.
 */

const TestVoice = (() => {
    let allVoices = [];
    let currentCategory = 'all';
    let searchQuery = '';
    let currentAudio = null;
    let playingVoiceId = null;
    const audioCache = new Map(); // key: voiceId + text -> audioUrl

    // Preset sample texts
    const PRESET_TEXTS = {
        'km-edu': 'សួស្តីបងប្អូនទាំងអស់គ្នា សូមស្វាគមន៍មកកាន់ការចែករំលែកចំណេះដឹង និងបច្ចេកវិទ្យា AI ថ្ងៃនេះ។',
        'km-biz': 'យុទ្ធសាស្ត្រពង្រីកទីផ្សារ និងការគ្រប់គ្រងហិរញ្ញវត្ថុសម្រាប់អាជីវកម្មថ្មីៗក្នុងយុគសម័យឌីជីថល។',
        'km-news': 'សូមស្វាគមន៍មកកាន់ការផ្សាយព័ត៌មានជាតិ និងអន្តរជាតិ ព្រមទាំងព្រឹត្តិការណ៍សេដ្ឋកិច្ចសំខាន់ៗប្រចាំថ្ងៃ។',
        'km-recap': 'នៅក្នុងរាត្រីដ៏ស្ងប់ស្ងាត់ ស្រាប់តែមានរឿងរ៉ាវចម្លែកមួយបានកើតឡើង ដែលគ្មាននរណាម្នាក់នឹកស្មានដល់។',
        'km-char': 'ឯងគិតថាឯងអាចគេចផុតពីកណ្តាប់ដៃយើងបានឬ? វាមិនងាយស្រួលដូចការគិតរបស់ឯងនោះទេ!',
        'km-kids': 'សួស្តីមិត្តភក្តិតូចៗទាំងអស់គ្នា! ថ្ងៃនេះយើងនឹងទៅដើរលេងកម្សាន្តនៅសួនសត្វជាមួយគ្នា តោះទៅ!',
        'km-story': 'កាលពីព្រេងនាយ មានព្រះរាជាណាចក្រដ៏ស្ងប់សុខមួយ ដែលពោរពេញទៅដោយធម្មជាតិស្រស់បំព្រង។',
        'km-health': 'ការថែទាំសុខភាពបេះដូង និងរបបអាហារូបត្ថម្ភប្រចាំថ្ងៃដើម្បីសុខភាពល្អ និងអាយុយឺនយូរ។',
        'km-travel': 'ដំណើរកម្សាន្តទៅកាន់ទឹកដីប្រវត្តិសាស្ត្រអង្គរវត្ត និងតំបន់ទេសចរណ៍ធម្មជាតិដ៏ស្រស់ត្រកាល។',
        'km-food': 'ថ្ងៃនេះខ្ញុំនឹងបង្ហាញពីរបៀបស្លស្លុកកកូរខ្មែរឈ្ងុយឆ្ងាញ់តាមរូបមន្តដើមពិតៗ។',
        'km-general': 'សូមស្វាគមន៍មកកាន់ VoxSync AI Studio ប្រព័ន្ធសំឡេងឆ្លាតវៃកម្រិតខ្ពស់។',
        'en-general': 'Welcome to VoxSync AI Studio, the ultimate platform for high-definition neural speech synthesis.',
        'intl-sample': 'こんにちは！ 안녕하세요! 欢迎使用 VoxSync AI Studio.'
    };

    // Category mapping, UI metadata & vibrant theme gradients
    const CATEGORY_META = {
        'all': {
            label: 'ទាំងអស់ (All Voices)',
            icon: '✨',
            gradient: 'from-indigo-600 to-cyan-500',
            bgBadge: 'bg-slate-800 text-slate-200'
        },
        'favorites': {
            label: '⭐ សំឡេងពេញចិត្ត (Favorites)',
            icon: '⭐',
            gradient: 'from-amber-400 via-yellow-500 to-amber-600',
            bgBadge: 'bg-amber-950/90 text-amber-300 border-amber-500/70'
        },
        'active': {
            label: '✓ បានដាក់ក្នុង TTS (In Dropdown)',
            icon: '🎯',
            gradient: 'from-emerald-500 to-teal-600',
            bgBadge: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/70'
        },
        'Education': {
            label: '📚 អប់រំ & ចំណេះដឹង',
            icon: '👨‍🏫',
            gradient: 'from-blue-600 to-indigo-600',
            bgBadge: 'bg-blue-950/80 text-blue-300 border-blue-800/60'
        },
        'Business': {
            label: '💼 អាជីវកម្ម & ទីផ្សារ',
            icon: '💼',
            gradient: 'from-amber-500 to-yellow-600',
            bgBadge: 'bg-amber-950/80 text-amber-300 border-amber-800/60'
        },
        'News': {
            label: '📰 ព័ត៌មាន & កីឡា',
            icon: '🎙️',
            gradient: 'from-red-600 to-rose-600',
            bgBadge: 'bg-red-950/80 text-red-300 border-red-800/60'
        },
        'Recap': {
            label: '🎬 សម្រាយរឿង (Recap)',
            icon: '🍿',
            gradient: 'from-orange-500 to-amber-600',
            bgBadge: 'bg-orange-950/80 text-orange-300 border-orange-800/60'
        },
        'Character': {
            label: '🎭 សំឡេងតួអង្គ & Anime',
            icon: '🦸',
            gradient: 'from-purple-600 to-pink-600',
            bgBadge: 'bg-purple-950/80 text-purple-300 border-purple-800/60'
        },
        'Kids': {
            label: '👶 សំឡេងកុមារ & តុក្កតា',
            icon: '🐣',
            gradient: 'from-emerald-600 to-teal-500',
            bgBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
        },
        'Storytelling': {
            label: '📖 និទានរឿង & ASMR',
            icon: '🌙',
            gradient: 'from-rose-600 to-red-500',
            bgBadge: 'bg-rose-950/80 text-rose-300 border-rose-800/60'
        },
        'Health': {
            label: '🏥 សុខភាព & វេជ្ជសាស្ត្រ',
            icon: '👨‍⚕️',
            gradient: 'from-teal-500 to-emerald-600',
            bgBadge: 'bg-teal-950/80 text-teal-300 border-teal-800/60'
        },
        'Travel': {
            label: '✈️ ទេសចរណ៍ & Vlogs',
            icon: '🗺️',
            gradient: 'from-sky-500 to-blue-600',
            bgBadge: 'bg-sky-950/80 text-sky-300 border-sky-800/60'
        },
        'Food': {
            label: '🍲 ម្ហូបអាហារ & ចុងភៅ',
            icon: '👨‍🍳',
            gradient: 'from-amber-600 to-orange-500',
            bgBadge: 'bg-amber-950/80 text-amber-300 border-amber-800/60'
        },
        'Entertainment': {
            label: '🎮 ហ្គេម & AI Tech',
            icon: '🤖',
            gradient: 'from-violet-600 to-indigo-600',
            bgBadge: 'bg-violet-950/80 text-violet-300 border-violet-800/60'
        },
        'General': {
            label: '🇰🇭 សំឡេងគោល (Standard)',
            icon: '⚡',
            gradient: 'from-teal-600 to-cyan-600',
            bgBadge: 'bg-teal-950/80 text-teal-300 border-teal-800/60'
        },
        'English': {
            label: '🇺🇸 English (US/UK/AU)',
            icon: '🌐',
            gradient: 'from-cyan-600 to-blue-500',
            bgBadge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60'
        },
        'International': {
            label: '🌏 ភាសាអន្តរជាតិ (JP/KR/CN/TH/FR...)',
            icon: '🎌',
            gradient: 'from-emerald-600 to-cyan-600',
            bgBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
        },
        'Custom': {
            label: '🎛️ សំឡេងផ្ទាល់ខ្លួន (Custom AI Models)',
            icon: '🎛️',
            gradient: 'from-fuchsia-600 via-purple-600 to-indigo-600',
            bgBadge: 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-800/60'
        },
        'cloned': {
            label: '✨ Cloned Voices',
            icon: '🧬',
            gradient: 'from-fuchsia-600 to-purple-600',
            bgBadge: 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-800/60'
        }
    };

    // DOM Elements cache
    let elements = {};

    function cacheElements() {
        elements = {
            voiceCardsGrid: document.getElementById('tvCardsGrid'),
            searchInput: document.getElementById('tvSearchInput'),
            categoryFilterContainer: document.getElementById('tvCategoryFilters'),
            sampleTextInput: document.getElementById('tvSampleText'),
            presetButtons: document.querySelectorAll('.tv-preset-btn'),
            voiceCountBadge: document.getElementById('tvVoiceCountBadge'),
            speedSlider: document.getElementById('tvSpeedSlider'),
            speedValue: document.getElementById('tvSpeedValue'),
            refreshBtn: document.getElementById('tvRefreshBtn'),

            // Custom Voice Studio Elements
            custStudioToggle: document.getElementById('tvCustomStudioToggle'),
            custStudioToggleBtn: document.getElementById('tvCustomStudioToggleBtn'),
            custStudioBody: document.getElementById('tvCustomStudioBody'),
            custToggleText: document.getElementById('tvCustomToggleText'),
            custToggleIcon: document.getElementById('tvCustomToggleIcon'),
            custPresetBtns: document.querySelectorAll('.tv-cpreset-btn'),
            custBaseVoice: document.getElementById('custBaseVoice'),
            custPitchSlider: document.getElementById('custPitchSlider'),
            custPitchVal: document.getElementById('custPitchVal'),
            custFormantSlider: document.getElementById('custFormantSlider'),
            custFormantVal: document.getElementById('custFormantVal'),
            custBassSlider: document.getElementById('custBassSlider'),
            custBassVal: document.getElementById('custBassVal'),
            custMidSlider: document.getElementById('custMidSlider'),
            custMidVal: document.getElementById('custMidVal'),
            custTrebleSlider: document.getElementById('custTrebleSlider'),
            custTrebleVal: document.getElementById('custTrebleVal'),
            custCompressionSelect: document.getElementById('custCompressionSelect'),
            custReverbSelect: document.getElementById('custReverbSelect'),
            custModelName: document.getElementById('custModelName'),
            custPreviewBtn: document.getElementById('custPreviewBtn'),
            custSaveBtn: document.getElementById('custSaveBtn'),
            custPreviewPlayerBox: document.getElementById('custPreviewPlayerBox'),
            custPlayPauseBtn: document.getElementById('custPlayPauseBtn'),
            custPlayIcon: document.getElementById('custPlayIcon'),
            custAudioTime: document.getElementById('custAudioTime'),
            custAudioElement: document.getElementById('custAudioElement')
        };
    }

    /**
     * Fetch all voice models from backend
     */
    async function loadVoices() {
        try {
            if (elements.voiceCardsGrid) {
                elements.voiceCardsGrid.innerHTML = `
                    <div class="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <div class="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        <p class="text-sm font-medium text-slate-300">កំពុងផ្ទុកបណ្ណាល័យម៉ូឌែលសំឡេងទាំងអស់...</p>
                    </div>
                `;
            }

            const res = await fetch('/api/tts/voices');
            const data = await res.json();

            if (data.success && data.voices) {
                const flatList = [];

                // Khmer voices
                if (Array.isArray(data.voices.km)) {
                    data.voices.km.forEach(v => {
                        flatList.push({
                            ...v,
                            lang: 'km',
                            category: v.isCustom ? 'Custom' : (v.isCloned ? 'cloned' : (v.category || 'General'))
                        });
                    });
                }

                // English & International voices
                if (Array.isArray(data.voices.en)) {
                    data.voices.en.forEach(v => {
                        flatList.push({
                            ...v,
                            lang: v.lang || 'en',
                            category: v.isCustom ? 'Custom' : (v.isCloned ? 'cloned' : (v.category || (v.lang === 'en' ? 'English' : 'International')))
                        });
                    });
                }

                allVoices = flatList;
                renderCategoryFilters();
                renderCards();
            } else {
                throw new Error(data.error || 'Failed to fetch voice models');
            }
        } catch (err) {
            console.error('Error loading voices in TestVoice module:', err);
            if (elements.voiceCardsGrid) {
                elements.voiceCardsGrid.innerHTML = `
                    <div class="col-span-full py-16 text-center text-rose-400 text-xs">
                        <p class="font-bold text-sm">មិនអាចទាញយកបញ្ជីសំឡេងបានទេ</p>
                        <p class="text-slate-500 mt-1">${err.message}</p>
                        <button onclick="TestVoice.loadVoices()" class="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-md">សាកល្បងម្ដងទៀត</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Render category filter pills
     */
    function renderCategoryFilters() {
        if (!elements.categoryFilterContainer) return;

        const favIds = (typeof getFavoriteVoiceIds === 'function') ? getFavoriteVoiceIds() : [];

        // Group counts
        const counts = {
            all: allVoices.length,
            favorites: allVoices.filter(v => favIds.includes(v.id)).length,
            active: allVoices.filter(v => typeof isVoiceActiveInTTS === 'function' ? isVoiceActiveInTTS(v.id) : false).length
        };

        allVoices.forEach(v => {
            const cat = v.isCustom ? 'Custom' : (v.isCloned ? 'cloned' : (v.category || (v.lang === 'km' ? 'General' : (v.lang === 'en' ? 'English' : 'International'))));
            counts[cat] = (counts[cat] || 0) + 1;
        });

        const categoriesToShow = ['all', 'favorites', 'active', 'Custom', 'Education', 'Business', 'News', 'Health', 'Travel', 'Food', 'Recap', 'Character', 'Kids', 'Storytelling', 'Entertainment', 'General', 'English', 'International', 'cloned'];

        elements.categoryFilterContainer.innerHTML = categoriesToShow
            .filter(cat => counts[cat] > 0 || cat === 'all' || cat === 'favorites' || cat === 'active')
            .map(cat => {
                const meta = CATEGORY_META[cat] || { label: cat, icon: '🎙️', gradient: 'from-indigo-600 to-cyan-600' };
                const count = counts[cat] || 0;
                const isActive = currentCategory === cat;
                return `
                    <button data-category="${cat}" class="tv-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                        isActive
                            ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/30 scale-[1.02]'
                            : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/80'
                    }">
                        <span>${meta.icon}</span>
                        <span>${meta.label}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-slate-800 text-slate-400'}">${count}</span>
                    </button>
                `;
            }).join('');

        // Bind filter clicks
        elements.categoryFilterContainer.querySelectorAll('.tv-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentCategory = btn.getAttribute('data-category');
                renderCategoryFilters();
                renderCards();
            });
        });
    }

    /**
     * Render voice cards based on current filters and search query
     */
    function renderCards() {
        if (!elements.voiceCardsGrid) return;

        const favIds = (typeof getFavoriteVoiceIds === 'function') ? getFavoriteVoiceIds() : [];

        let filtered = allVoices.filter(v => {
            // Category Filter
            if (currentCategory === 'favorites') {
                if (!favIds.includes(v.id)) return false;
            } else if (currentCategory === 'active') {
                if (typeof isVoiceActiveInTTS === 'function' && !isVoiceActiveInTTS(v.id)) return false;
            } else if (currentCategory === 'Custom') {
                if (!v.isCustom && v.category !== 'Custom') return false;
            } else if (currentCategory === 'cloned') {
                if (!v.isCloned) return false;
            } else if (currentCategory !== 'all') {
                const cat = v.isCustom ? 'Custom' : (v.category || (v.lang === 'km' ? 'General' : (v.lang === 'en' ? 'English' : 'International')));
                if (cat !== currentCategory) return false;
            }

            // Search Query Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = (v.name || '').toLowerCase().includes(q);
                const matchId = (v.id || '').toLowerCase().includes(q);
                const matchCat = (v.category || '').toLowerCase().includes(q);
                if (!matchName && !matchId && !matchCat) return false;
            }

            return true;
        });

        // Update count badge
        if (elements.voiceCountBadge) {
            elements.voiceCountBadge.textContent = `${filtered.length} Models`;
        }

        if (filtered.length === 0) {
            elements.voiceCardsGrid.innerHTML = `
                <div class="col-span-full py-16 text-center text-slate-400">
                    <span class="text-3xl block mb-2">🔍</span>
                    <p class="font-bold text-slate-300 text-sm">រកមិនឃើញម៉ូឌែលសំឡេងដែលត្រូវគ្នានោះទេ</p>
                    <p class="text-xs text-slate-500 mt-1">សូមព្យាយាមស្វែងរកពាក្យគន្លឹះផ្សេង ឬជ្រើសរើសប្រភេទផ្សេង</p>
                </div>
            `;
            return;
        }

        // Render card items
        elements.voiceCardsGrid.innerHTML = filtered.map(voice => {
            const isPlaying = playingVoiceId === voice.id;
            const isFav = favIds.includes(voice.id);
            const isInTts = (typeof isVoiceActiveInTTS === 'function') ? isVoiceActiveInTTS(voice.id) : true;
            const isCore = ['km-KH-PisethNeural', 'km-KH-SreymomNeural', 'en-US-JennyNeural', 'en-US-GuyNeural'].includes(voice.id);

            const meta = CATEGORY_META[voice.category] || CATEGORY_META[voice.lang === 'km' ? 'General' : (voice.lang === 'en' ? 'English' : 'International')] || { icon: '🎙️', gradient: 'from-indigo-600 to-cyan-500' };
            const categoryLabel = meta.label || voice.category || (voice.lang === 'km' ? 'Khmer' : 'English');
            
            // Gender badge colors & icons
            let genderBadge = '';
            if (voice.gender === 'Female') {
                genderBadge = `<span class="px-2.5 py-1 rounded-lg bg-pink-950/70 border border-pink-800/60 text-pink-300 text-[11px] font-semibold flex items-center gap-1">♀ ស្រី</span>`;
            } else if (voice.gender === 'Male') {
                genderBadge = `<span class="px-2.5 py-1 rounded-lg bg-blue-950/70 border border-blue-800/60 text-blue-300 text-[11px] font-semibold flex items-center gap-1">♂ ប្រុស</span>`;
            } else if (voice.gender === 'Child') {
                genderBadge = `<span class="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-800/60 text-amber-300 text-[11px] font-semibold flex items-center gap-1">👶 កុមារ</span>`;
            } else if (voice.isCustom) {
                genderBadge = `<span class="px-2.5 py-1 rounded-lg bg-fuchsia-950/80 border border-fuchsia-800/60 text-fuchsia-300 text-[11px] font-semibold flex items-center gap-1">🎛️ Custom</span>`;
            } else if (voice.isCloned) {
                genderBadge = `<span class="px-2.5 py-1 rounded-lg bg-purple-950/70 border border-purple-800/60 text-purple-300 text-[11px] font-semibold flex items-center gap-1">✨ Cloned</span>`;
            }

            const langBadge = voice.lang === 'km'
                ? `<span class="px-2.5 py-1 rounded-lg bg-indigo-950/90 border border-indigo-800/70 text-indigo-300 text-[11px] font-mono font-bold">🇰🇭 KM</span>`
                : (voice.lang === 'en'
                    ? `<span class="px-2.5 py-1 rounded-lg bg-cyan-950/90 border border-cyan-800/70 text-cyan-300 text-[11px] font-mono font-bold">🇺🇸 EN</span>`
                    : `<span class="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-800/70 text-emerald-300 text-[11px] font-mono font-bold uppercase">${voice.lang}</span>`);

            // Clean display title
            const rawName = voice.name || voice.id;

            return `
                <div class="voice-card-premium rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between gap-4 relative overflow-hidden group ${
                    isPlaying ? 'voice-card-playing ring-2 ring-indigo-500/80 shadow-2xl' : ''
                }" data-voice-id="${voice.id}">

                    <!-- Top Row: Avatar, Title Header & Favorite Star -->
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-start gap-3.5 min-w-0 flex-1">
                            <!-- Avatar Icon with Equalizer Wave -->
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr ${meta.gradient} flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 ring-2 ring-white/10 relative overflow-hidden group-hover:scale-105 transition-transform">
                                ${isPlaying ? `
                                    <div class="flex items-end gap-1 h-5 z-10">
                                        <span class="w-1 bg-white rounded-full eq-bar-1"></span>
                                        <span class="w-1 bg-white rounded-full eq-bar-2"></span>
                                        <span class="w-1 bg-white rounded-full eq-bar-3"></span>
                                        <span class="w-1 bg-white rounded-full eq-bar-4"></span>
                                    </div>
                                ` : `
                                    <span class="text-xl">${voice.isCustom ? '🎛️' : (voice.isCloned ? '🧬' : meta.icon)}</span>
                                `}
                            </div>

                            <!-- Titles & IDs -->
                            <div class="min-w-0 flex-1">
                                <h4 class="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                                    <span class="truncate">${rawName}</span>
                                </h4>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 truncate">${voice.id}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Favorite Toggle Star Button -->
                        <button class="tv-fav-btn p-2 rounded-xl border transition-all duration-200 shrink-0 ${
                            isFav
                                ? 'bg-amber-950/90 border-amber-500/80 text-amber-400 shadow-md shadow-amber-500/20 scale-105 ring-1 ring-amber-400/40'
                                : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-amber-300 hover:border-amber-500/40 hover:bg-slate-800 active:scale-90'
                        }" data-voice-id="${voice.id}" title="${isFav ? 'ដកចេញពីបញ្ជីពេញចិត្ត (Remove Favorite)' : 'ដាក់ជាសំឡេងពេញចិត្ត (Add to Favorite)'}">
                            <svg class="w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : 'fill-none stroke-current'}" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </button>
                    </div>

                    <!-- Middle Row: Category Badges & Tags -->
                    <div class="flex items-center flex-wrap gap-2 pt-1 border-t border-slate-800/60">
                        ${langBadge}
                        ${genderBadge}
                        <span class="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-medium truncate">
                            ${categoryLabel}
                        </span>
                        ${isFav ? `<span class="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-600/50 text-amber-300 text-[10px] font-bold">⭐ Favorite</span>` : ''}
                        ${isInTts ? `<span class="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1">✓ In TTS</span>` : ''}
                    </div>

                    <!-- Bottom Action Controls -->
                    <div class="pt-2 border-t border-slate-800/80 flex flex-col gap-2.5">
                        <!-- Playing Wave Bar -->
                        <div class="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden ${isPlaying ? 'block' : 'hidden'}">
                            <div class="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-purple-500 w-full animate-pulse"></div>
                        </div>

                        <div class="flex items-center gap-2">
                            <!-- Play / Pause Preview Button -->
                            <button class="tv-play-btn flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                                isPlaying
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 ring-1 ring-rose-400'
                                    : 'gradient-bg-btn text-white hover:opacity-95 shadow-md shadow-indigo-600/25 active:scale-95'
                            }" data-voice-id="${voice.id}" data-lang="${voice.lang}">
                                <span>
                                    ${isPlaying ? `
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                                    ` : `
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    `}
                                </span>
                                <span class="tracking-wide">${isPlaying ? 'បញ្ឈប់ (Stop)' : 'ស្តាប់សំឡេង'}</span>
                            </button>

                            <!-- Add / Remove from TTS Toggle Button -->
                            <button class="tv-toggle-tts-btn px-2.5 py-2.5 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 shrink-0 ${
                                isInTts
                                    ? (isCore ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-950/80 hover:bg-rose-950 text-emerald-300 hover:text-rose-300 border-emerald-700/80 hover:border-rose-700/80')
                                    : 'bg-slate-900 hover:bg-indigo-950 text-slate-300 hover:text-indigo-300 border-slate-800 hover:border-indigo-700/80'
                            }" title="${isInTts ? (isCore ? 'សំឡេងគោលស្តង់ដារ (Standard Core Voice)' : 'ដកចេញពីបញ្ជី TTS Dropdown') : 'បន្ថែមចូលក្នុងបញ្ជី TTS Dropdown'}" data-voice-id="${voice.id}" ${isCore ? 'disabled' : ''}>
                                <span>${isInTts ? (isCore ? '🔒' : '➖') : '➕'}</span>
                                <span class="text-[11px] hidden sm:inline">${isInTts ? (isCore ? 'Core' : 'Remove') : 'Add TTS'}</span>
                            </button>

                            <!-- Delete Custom Voice Button (if custom) -->
                            ${voice.isCustom ? `
                                <button class="tv-del-custom-btn px-2.5 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 hover:border-rose-600 transition-all text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 shrink-0" title="លុបម៉ូឌែលផ្ទាល់ខ្លួននេះ" data-voice-id="${voice.id}" data-voice-name="${rawName}">
                                    <span>🗑️</span>
                                </button>
                            ` : ''}

                            <!-- Use directly in TTS Studio Button -->
                            <button class="tv-use-tts-btn px-3 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/80 hover:border-indigo-500 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0" title="ជ្រើសរើសសំឡេងនេះ ហើយចូលទៅកាន់ TTS Studio ភ្លាមៗ" data-voice-id="${voice.id}" data-lang="${voice.lang}">
                                <span>⚡</span>
                                <span class="font-bold">Use</span>
                            </button>
                        </div>
                    </div>

                </div>
            `;
        }).join('');

        // Bind Play buttons
        elements.voiceCardsGrid.querySelectorAll('.tv-play-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const voiceId = btn.getAttribute('data-voice-id');
                const voiceLang = btn.getAttribute('data-lang');
                togglePlayVoice(voiceId, voiceLang);
            });
        });

        // Bind Favorite buttons
        elements.voiceCardsGrid.querySelectorAll('.tv-fav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const voiceId = btn.getAttribute('data-voice-id');
                if (typeof toggleFavoriteVoice === 'function') {
                    const isFav = toggleFavoriteVoice(voiceId);
                    if (typeof showToast === 'function') {
                        showToast(isFav ? `⭐ បានបន្ថែម "${voiceId}" ទៅក្នុងបញ្ជីពេញចិត្ត` : `បានដក "${voiceId}" ចេញពីបញ្ជីពេញចិត្ត`, 'info');
                    }
                    renderCategoryFilters();
                    renderCards();
                }
            });
        });

        // Bind Add/Remove from TTS toggle buttons
        elements.voiceCardsGrid.querySelectorAll('.tv-toggle-tts-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const voiceId = btn.getAttribute('data-voice-id');
                if (typeof toggleVoiceInTTS === 'function') {
                    const added = toggleVoiceInTTS(voiceId);
                    if (typeof showToast === 'function') {
                        showToast(added ? `✓ បានបន្ថែម "${voiceId}" ចូលទៅក្នុង Dropdown នៃ TTS Studio` : `បានដក "${voiceId}" ចេញពី Dropdown នៃ TTS Studio`, 'success');
                    }
                    renderCategoryFilters();
                    renderCards();
                }
            });
        });

        // Bind Delete Custom Model buttons
        elements.voiceCardsGrid.querySelectorAll('.tv-del-custom-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const voiceId = btn.getAttribute('data-voice-id');
                const voiceName = btn.getAttribute('data-voice-name');
                if (confirm(`តើអ្នកពិតជាចង់លុបម៉ូឌែលសំឡេង "${voiceName}" នេះមែនទេ?`)) {
                    try {
                        const res = await fetch(`/api/tts/custom-voice/${encodeURIComponent(voiceId)}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success) {
                            if (typeof removeVoiceFromTTS === 'function') removeVoiceFromTTS(voiceId);
                            if (typeof showToast === 'function') showToast(`បានលុបម៉ូឌែល "${voiceName}" រួចរាល់!`, 'info');
                            loadVoices();
                        } else {
                            if (typeof showToast === 'function') showToast(`បរាជ័យក្នុងការលុប៖ ${data.error || 'Unknown'}`, 'error');
                        }
                    } catch (err) {
                        if (typeof showToast === 'function') showToast(`កំហុស៖ ${err.message}`, 'error');
                    }
                }
            });
        });

        // Bind "Use in TTS Studio" buttons
        elements.voiceCardsGrid.querySelectorAll('.tv-use-tts-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const voiceId = btn.getAttribute('data-voice-id');
                const voiceLang = btn.getAttribute('data-lang');
                useInTtsStudio(voiceId, voiceLang);
            });
        });
    }

    /**
     * Get sample text to speak for given language
     */
    function getSampleText(lang = 'km') {
        const customText = elements.sampleTextInput ? elements.sampleTextInput.value.trim() : '';
        if (customText) return customText;

        const langLower = (lang || '').toLowerCase();
        if (langLower.startsWith('ja')) return 'こんにちは！ VoxSync AI への音声合成テストです。';
        if (langLower.startsWith('ko')) return '안녕하세요! VoxSync AI 고품질 음성 합성 테스트입니다.';
        if (langLower.startsWith('zh')) return '您好！欢迎使用 VoxSync AI 超高清语音合成系统。';
        if (langLower.startsWith('th')) return 'สวัสดีครับ ยินดีต้อนรับสู่ระบบเสียง VoxSync AI ครับ';
        if (langLower.startsWith('fr')) return 'Bonjour et bienvenue sur le studio de synthèse vocale VoxSync AI.';
        if (langLower.startsWith('es')) return 'Hola y bienvenido al estudio de voz de alta fidelidad VoxSync AI.';
        if (langLower.startsWith('de')) return 'Hallo und herzlich willkommen beim VoxSync AI Sprachstudio.';
        if (langLower.startsWith('en')) return PRESET_TEXTS['en-general'];

        return PRESET_TEXTS['km-general'];
    }

    /**
     * Play or Stop preview for a specific voice card
     */
    async function togglePlayVoice(voiceId, voiceLang) {
        if (playingVoiceId === voiceId && currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            playingVoiceId = null;
            renderCards();
            return;
        }

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            playingVoiceId = null;
        }

        playingVoiceId = voiceId;
        renderCards();

        const speed = elements.speedSlider ? parseFloat(elements.speedSlider.value) : 1.0;
        const textToSpeak = getSampleText(voiceLang);
        const cacheKey = `${voiceId}_${voiceLang}_${speed}_${textToSpeak}`;

        try {
            let audioUrl = audioCache[cacheKey];

            if (!audioUrl) {
                const res = await fetch('/api/tts/synthesize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        voice: voiceId,
                        lang: voiceLang || 'km',
                        text: textToSpeak,
                        rate: speed
                    })
                });

                const data = await res.json();
                if (!data.success || !data.audioUrl) {
                    throw new Error(data.error || 'Failed to synthesize voice sample');
                }

                audioUrl = data.audioUrl;
                audioCache[cacheKey] = audioUrl;
            }

            if (playingVoiceId !== voiceId) {
                return;
            }

            currentAudio = new Audio(audioUrl);
            currentAudio.onended = () => {
                playingVoiceId = null;
                currentAudio = null;
                renderCards();
            };
            currentAudio.onerror = (e) => {
                console.error('Audio playback error:', e);
                playingVoiceId = null;
                currentAudio = null;
                renderCards();
                if (typeof showToast === 'function') {
                    showToast('កំហុសពេលចាក់សំឡេង', 'error');
                }
            };

            await currentAudio.play();
        } catch (err) {
            console.error('Error generating test voice:', err);
            playingVoiceId = null;
            currentAudio = null;
            renderCards();
            if (typeof showToast === 'function') {
                showToast(`បរាជ័យក្នុងការបង្កើតសំឡេង៖ ${err.message}`, 'error');
            }
        }
    }

    /**
     * Switch to TTS Studio tab and select this voice
     */
    function useInTtsStudio(voiceId, voiceLang) {
        // Automatically ensure this voice is added to TTS active list
        if (typeof addVoiceToTTS === 'function') {
            addVoiceToTTS(voiceId);
        }

        const tabTtsBtn = document.getElementById('tabTtsBtn');
        const scriptInput = document.getElementById('ttsScriptInput') || document.getElementById('scriptInput');
        const langSelect = document.getElementById('ttsLangSelect') || document.getElementById('langSelect');
        const voiceSelect = document.getElementById('ttsVoiceSelect') || document.getElementById('voiceSelect');

        // Copy text if entered
        const sampleText = elements.sampleTextInput ? elements.sampleTextInput.value.trim() : '';
        if (scriptInput && sampleText) {
            scriptInput.value = sampleText;
            scriptInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Set language
        if (langSelect && langSelect.value !== voiceLang) {
            langSelect.value = voiceLang;
            langSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Set selected voice
        setTimeout(() => {
            if (voiceSelect) {
                voiceSelect.value = voiceId;
                voiceSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, 150);

        // Click TTS tab
        if (tabTtsBtn) {
            tabTtsBtn.click();
        }

        if (typeof showToast === 'function') {
            showToast(`បានដាក់សំឡេង "${voiceId}" ក្នុង TTS Studio រួចរាល់!`, 'success');
        }
    }

    /**
     * Bind AI Voice Customizer & Acoustic Tuner Studio Events
     */
    function bindCustomStudioEvents() {
        // Accordion Toggle
        const toggleStudio = () => {
            if (!elements.custStudioBody) return;
            const isHidden = elements.custStudioBody.classList.contains('hidden');
            if (isHidden) {
                elements.custStudioBody.classList.remove('hidden');
                elements.custStudioBody.classList.add('flex');
                if (elements.custToggleText) elements.custToggleText.textContent = '❌ បិទផ្ទាំងកែច្នៃ (Collapse Studio)';
                if (elements.custToggleIcon) elements.custToggleIcon.classList.add('rotate-180');
            } else {
                elements.custStudioBody.classList.add('hidden');
                elements.custStudioBody.classList.remove('flex');
                if (elements.custToggleText) elements.custToggleText.textContent = '✨ បើកផ្ទាំងកែច្នៃ (Custom Studio)';
                if (elements.custToggleIcon) elements.custToggleIcon.classList.remove('rotate-180');
            }
        };

        if (elements.custStudioToggle) {
            elements.custStudioToggle.addEventListener('click', toggleStudio);
        }

        // Sliders value updates
        if (elements.custPitchSlider && elements.custPitchVal) {
            elements.custPitchSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                elements.custPitchVal.textContent = `${val >= 0 ? '+' : ''}${val} Hz`;
            });
        }

        if (elements.custFormantSlider && elements.custFormantVal) {
            elements.custFormantSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value).toFixed(2);
                elements.custFormantVal.textContent = `${val}x`;
            });
        }

        if (elements.custBassSlider && elements.custBassVal) {
            elements.custBassSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                elements.custBassVal.textContent = `${val >= 0 ? '+' : ''}${val} dB`;
            });
        }

        if (elements.custMidSlider && elements.custMidVal) {
            elements.custMidSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                elements.custMidVal.textContent = `${val >= 0 ? '+' : ''}${val} dB`;
            });
        }

        if (elements.custTrebleSlider && elements.custTrebleVal) {
            elements.custTrebleSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                elements.custTrebleVal.textContent = `${val >= 0 ? '+' : ''}${val} dB`;
            });
        }

        // Preset Templates Handler
        if (elements.custPresetBtns) {
            elements.custPresetBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const preset = btn.getAttribute('data-cpreset');
                    if (preset === 'radio') {
                        if (elements.custBaseVoice) elements.custBaseVoice.value = 'km-KH-PisethNeural';
                        if (elements.custPitchSlider) { elements.custPitchSlider.value = 0; elements.custPitchSlider.dispatchEvent(new Event('input')); }
                        if (elements.custFormantSlider) { elements.custFormantSlider.value = 0.95; elements.custFormantSlider.dispatchEvent(new Event('input')); }
                        if (elements.custBassSlider) { elements.custBassSlider.value = 6; elements.custBassSlider.dispatchEvent(new Event('input')); }
                        if (elements.custMidSlider) { elements.custMidSlider.value = 2; elements.custMidSlider.dispatchEvent(new Event('input')); }
                        if (elements.custTrebleSlider) { elements.custTrebleSlider.value = 4; elements.custTrebleSlider.dispatchEvent(new Event('input')); }
                        if (elements.custCompressionSelect) elements.custCompressionSelect.value = 'radio';
                        if (elements.custReverbSelect) elements.custReverbSelect.value = 'booth';
                    } else if (preset === 'cinema') {
                        if (elements.custBaseVoice) elements.custBaseVoice.value = 'km-KH-PisethNeural';
                        if (elements.custPitchSlider) { elements.custPitchSlider.value = -20; elements.custPitchSlider.dispatchEvent(new Event('input')); }
                        if (elements.custFormantSlider) { elements.custFormantSlider.value = 0.75; elements.custFormantSlider.dispatchEvent(new Event('input')); }
                        if (elements.custBassSlider) { elements.custBassSlider.value = 8; elements.custBassSlider.dispatchEvent(new Event('input')); }
                        if (elements.custMidSlider) { elements.custMidSlider.value = -2; elements.custMidSlider.dispatchEvent(new Event('input')); }
                        if (elements.custTrebleSlider) { elements.custTrebleSlider.value = 2; elements.custTrebleSlider.dispatchEvent(new Event('input')); }
                        if (elements.custCompressionSelect) elements.custCompressionSelect.value = 'medium';
                        if (elements.custReverbSelect) elements.custReverbSelect.value = 'room';
                    } else if (preset === 'anime') {
                        if (elements.custBaseVoice) elements.custBaseVoice.value = 'km-KH-SreymomNeural';
                        if (elements.custPitchSlider) { elements.custPitchSlider.value = 35; elements.custPitchSlider.dispatchEvent(new Event('input')); }
                        if (elements.custFormantSlider) { elements.custFormantSlider.value = 1.35; elements.custFormantSlider.dispatchEvent(new Event('input')); }
                        if (elements.custBassSlider) { elements.custBassSlider.value = -4; elements.custBassSlider.dispatchEvent(new Event('input')); }
                        if (elements.custMidSlider) { elements.custMidSlider.value = 3; elements.custMidSlider.dispatchEvent(new Event('input')); }
                        if (elements.custTrebleSlider) { elements.custTrebleSlider.value = 6; elements.custTrebleSlider.dispatchEvent(new Event('input')); }
                        if (elements.custCompressionSelect) elements.custCompressionSelect.value = 'light';
                        if (elements.custReverbSelect) elements.custReverbSelect.value = 'off';
                    } else if (preset === 'robot') {
                        if (elements.custBaseVoice) elements.custBaseVoice.value = 'km-KH-PisethNeural';
                        if (elements.custPitchSlider) { elements.custPitchSlider.value = 0; elements.custPitchSlider.dispatchEvent(new Event('input')); }
                        if (elements.custFormantSlider) { elements.custFormantSlider.value = 0.70; elements.custFormantSlider.dispatchEvent(new Event('input')); }
                        if (elements.custBassSlider) { elements.custBassSlider.value = 3; elements.custBassSlider.dispatchEvent(new Event('input')); }
                        if (elements.custMidSlider) { elements.custMidSlider.value = 6; elements.custMidSlider.dispatchEvent(new Event('input')); }
                        if (elements.custTrebleSlider) { elements.custTrebleSlider.value = 8; elements.custTrebleSlider.dispatchEvent(new Event('input')); }
                        if (elements.custCompressionSelect) elements.custCompressionSelect.value = 'radio';
                        if (elements.custReverbSelect) elements.custReverbSelect.value = 'booth';
                    } else if (preset === 'mindful') {
                        if (elements.custBaseVoice) elements.custBaseVoice.value = 'km-KH-SreymomNeural';
                        if (elements.custPitchSlider) { elements.custPitchSlider.value = -12; elements.custPitchSlider.dispatchEvent(new Event('input')); }
                        if (elements.custFormantSlider) { elements.custFormantSlider.value = 0.90; elements.custFormantSlider.dispatchEvent(new Event('input')); }
                        if (elements.custBassSlider) { elements.custBassSlider.value = 4; elements.custBassSlider.dispatchEvent(new Event('input')); }
                        if (elements.custMidSlider) { elements.custMidSlider.value = -2; elements.custMidSlider.dispatchEvent(new Event('input')); }
                        if (elements.custTrebleSlider) { elements.custTrebleSlider.value = 4; elements.custTrebleSlider.dispatchEvent(new Event('input')); }
                        if (elements.custCompressionSelect) elements.custCompressionSelect.value = 'light';
                        if (elements.custReverbSelect) elements.custReverbSelect.value = 'room';
                    } else if (preset === 'reset') {
                        if (elements.custBaseVoice) elements.custBaseVoice.value = 'km-KH-PisethNeural';
                        if (elements.custPitchSlider) { elements.custPitchSlider.value = 0; elements.custPitchSlider.dispatchEvent(new Event('input')); }
                        if (elements.custFormantSlider) { elements.custFormantSlider.value = 1.0; elements.custFormantSlider.dispatchEvent(new Event('input')); }
                        if (elements.custBassSlider) { elements.custBassSlider.value = 0; elements.custBassSlider.dispatchEvent(new Event('input')); }
                        if (elements.custMidSlider) { elements.custMidSlider.value = 0; elements.custMidSlider.dispatchEvent(new Event('input')); }
                        if (elements.custTrebleSlider) { elements.custTrebleSlider.value = 0; elements.custTrebleSlider.dispatchEvent(new Event('input')); }
                        if (elements.custCompressionSelect) elements.custCompressionSelect.value = 'off';
                        if (elements.custReverbSelect) elements.custReverbSelect.value = 'off';
                    }
                    if (typeof showToast === 'function') showToast(`បានអនុវត្ត Preset: ${preset}`, 'info');
                });
            });
        }

        // Live Preview Button
        if (elements.custPreviewBtn) {
            elements.custPreviewBtn.addEventListener('click', async () => {
                const text = getSampleText('km');
                const baseVoice = elements.custBaseVoice ? elements.custBaseVoice.value : 'km-KH-PisethNeural';
                const lang = baseVoice.startsWith('en-') ? 'en' : 'km';
                const pitch = elements.custPitchSlider ? parseInt(elements.custPitchSlider.value, 10) : 0;
                const formant = elements.custFormantSlider ? parseFloat(elements.custFormantSlider.value) : 1.0;
                const bass = elements.custBassSlider ? parseInt(elements.custBassSlider.value, 10) : 0;
                const mid = elements.custMidSlider ? parseInt(elements.custMidSlider.value, 10) : 0;
                const treble = elements.custTrebleSlider ? parseInt(elements.custTrebleSlider.value, 10) : 0;
                const compression = elements.custCompressionSelect ? elements.custCompressionSelect.value : 'off';
                const reverb = elements.custReverbSelect ? elements.custReverbSelect.value : 'off';

                elements.custPreviewBtn.disabled = true;
                elements.custPreviewBtn.innerHTML = `
                    <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>កំពុង Render...</span>
                `;

                try {
                    const res = await fetch('/api/tts/custom-preview', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text, baseVoice, lang, pitch, formant, bass, mid, treble, compression, reverb })
                    });

                    const data = await res.json();
                    if (!data.success || !data.audioUrl) {
                        throw new Error(data.error || 'Failed to render custom acoustic preview');
                    }

                    if (elements.custPreviewPlayerBox) {
                        elements.custPreviewPlayerBox.classList.remove('hidden');
                    }

                    if (elements.custAudioElement) {
                        elements.custAudioElement.src = data.audioUrl;
                        elements.custAudioElement.play();
                    }

                    if (elements.custPlayIcon) {
                        elements.custPlayIcon.innerHTML = `<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>`;
                    }

                    if (typeof showToast === 'function') {
                        showToast('✓ បាន Render សំឡេងកែច្នៃជោគជ័យ!', 'success');
                    }
                } catch (err) {
                    if (typeof showToast === 'function') {
                        showToast(`បរាជ័យក្នុងការ Render៖ ${err.message}`, 'error');
                    }
                } finally {
                    elements.custPreviewBtn.disabled = false;
                    elements.custPreviewBtn.innerHTML = `
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>🎧 Live Preview</span>
                    `;
                }
            });
        }

        // Preview Player Play/Pause
        if (elements.custPlayPauseBtn && elements.custAudioElement) {
            elements.custPlayPauseBtn.addEventListener('click', () => {
                if (elements.custAudioElement.paused) {
                    elements.custAudioElement.play();
                    if (elements.custPlayIcon) elements.custPlayIcon.innerHTML = `<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>`;
                } else {
                    elements.custAudioElement.pause();
                    if (elements.custPlayIcon) elements.custPlayIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
                }
            });

            elements.custAudioElement.addEventListener('ended', () => {
                if (elements.custPlayIcon) elements.custPlayIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
            });

            elements.custAudioElement.addEventListener('timeupdate', () => {
                if (elements.custAudioTime) {
                    const cur = Math.floor(elements.custAudioElement.currentTime || 0);
                    const dur = Math.floor(elements.custAudioElement.duration || 0);
                    elements.custAudioTime.textContent = `00:${String(cur).padStart(2, '0')} / 00:${String(dur).padStart(2, '0')}`;
                }
            });
        }

        // Save Custom Model Button
        if (elements.custSaveBtn) {
            elements.custSaveBtn.addEventListener('click', async () => {
                const name = elements.custModelName ? elements.custModelName.value.trim() : '';
                if (!name) {
                    if (typeof showToast === 'function') showToast('សូមបញ្ចូលឈ្មោះសម្រាប់ម៉ូឌែលសំឡេងថ្មីរបស់អ្នក', 'warning');
                    if (elements.custModelName) elements.custModelName.focus();
                    return;
                }

                const baseVoice = elements.custBaseVoice ? elements.custBaseVoice.value : 'km-KH-PisethNeural';
                const lang = baseVoice.startsWith('en-') ? 'en' : 'km';
                const pitch = elements.custPitchSlider ? parseInt(elements.custPitchSlider.value, 10) : 0;
                const formant = elements.custFormantSlider ? parseFloat(elements.custFormantSlider.value) : 1.0;
                const bass = elements.custBassSlider ? parseInt(elements.custBassSlider.value, 10) : 0;
                const mid = elements.custMidSlider ? parseInt(elements.custMidSlider.value, 10) : 0;
                const treble = elements.custTrebleSlider ? parseInt(elements.custTrebleSlider.value, 10) : 0;
                const compression = elements.custCompressionSelect ? elements.custCompressionSelect.value : 'off';
                const reverb = elements.custReverbSelect ? elements.custReverbSelect.value : 'off';

                elements.custSaveBtn.disabled = true;
                elements.custSaveBtn.innerHTML = `
                    <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>កំពុងរក្សាទុក...</span>
                `;

                try {
                    const res = await fetch('/api/tts/custom-save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, baseVoice, lang, pitch, formant, bass, mid, treble, compression, reverb })
                    });

                    const data = await res.json();
                    if (!data.success || !data.voice) {
                        throw new Error(data.error || 'Failed to save custom voice model');
                    }

                    // Automatically activate in TTS dropdown & favorites
                    if (typeof addVoiceToTTS === 'function') {
                        addVoiceToTTS(data.voice.id);
                    }
                    if (typeof toggleFavoriteVoice === 'function' && typeof isFavoriteVoice === 'function') {
                        if (!isFavoriteVoice(data.voice.id)) {
                            toggleFavoriteVoice(data.voice.id);
                        }
                    }

                    if (typeof showToast === 'function') {
                        showToast(`🎉 បានរក្សាទុកម៉ូឌែល "${name}" និងដាក់ចូលក្នុង Dropdown រួចរាល់!`, 'success');
                    }

                    if (elements.custModelName) elements.custModelName.value = '';

                    // Automatically switch category filter to 'Custom' so user immediately sees their new model!
                    currentCategory = 'Custom';
                    await loadVoices();

                    // Notify TTS Studio and Voice Changer Studio to refresh their dropdowns
                    window.dispatchEvent(new CustomEvent('voxsync:activeVoicesChanged', { detail: { voiceId: data.voice.id, action: 'add' } }));
                    window.dispatchEvent(new CustomEvent('voxsync:favoritesChanged', { detail: { voiceId: data.voice.id, isFav: true } }));
                } catch (err) {
                    if (typeof showToast === 'function') {
                        showToast(`បរាជ័យក្នុងការរក្សាទុក៖ ${err.message}`, 'error');
                    }
                } finally {
                    elements.custSaveBtn.disabled = false;
                    elements.custSaveBtn.innerHTML = `
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span>💾 រក្សាទុកម៉ូឌែល (Save Model)</span>
                    `;
                }
            });
        }
    }

    /**
     * Event Listeners setup
     */
    function bindEvents() {
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderCards();
            });
        }

        if (elements.presetButtons) {
            elements.presetButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const presetKey = btn.getAttribute('data-preset');
                    if (PRESET_TEXTS[presetKey] && elements.sampleTextInput) {
                        elements.sampleTextInput.value = PRESET_TEXTS[presetKey];
                        if (typeof showToast === 'function') {
                            showToast('បានប្ដូរអត្ថបទគំរូ', 'info');
                        }
                    }
                });
            });
        }

        if (elements.speedSlider && elements.speedValue) {
            elements.speedSlider.addEventListener('input', (e) => {
                elements.speedValue.textContent = `${e.target.value}x`;
            });
        }

        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', () => {
                loadVoices();
                if (typeof showToast === 'function') {
                    showToast('បាន Refresh បញ្ជីម៉ូឌែលសំឡេង', 'info');
                }
            });
        }

        bindCustomStudioEvents();

        // Listen for external favorite and active voice changes
        window.addEventListener('voxsync:favoritesChanged', () => {
            renderCategoryFilters();
            renderCards();
        });

        window.addEventListener('voxsync:activeVoicesChanged', () => {
            renderCategoryFilters();
            renderCards();
        });
    }

    /**
     * Module initialization
     */
    function init() {
        cacheElements();
        bindEvents();
        loadVoices();
    }

    return {
        init,
        loadVoices
    };
})();
