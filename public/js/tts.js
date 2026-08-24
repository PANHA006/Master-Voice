/**
 * VoxSync AI - Text-to-Speech Frontend Module
 */

const TTS = (() => {
    let ttsParsedLines = [];
    let rawLinesData = [];
    let currentActualMediaDuration = 0;
    let voicesData = { km: [], en: [] };
    let currentAudioDataUri = null;

    const SAMPLE_SCRIPTS = {
        en: `Tonight, when the sun goes down, you're going to flip a switch.
Light will flood the room and you won't think twice about it.
But for 99.9% of human history, that switch didn't exist.
When the sun set, the world went dark.`,
        km: `សូមស្វាគមន៍មកកាន់ VoxSync AI ដែលជាកម្មវិធីបំប្លែងសំឡេងដ៏ឆ្លាតវៃ។
ទទួលបានសំឡេងនិយាយធម្មជាតិ ជាមួយការកំណត់ពេលវេលាជាក់លាក់។
អ្នកអាចបំប្លែងអត្ថបទទៅជាសំឡេង និងសំឡេងទៅជាអត្ថបទយ៉ាងងាយស្រួល។
សូមអរគុណសម្រាប់ការប្រើប្រាស់សេវាកម្មរបស់យើង។`
    };

    let elements = {};

    async function init() {
        elements = {
            langSelect: document.getElementById('ttsLangSelect'),
            voiceSelect: document.getElementById('ttsVoiceSelect'),
            scriptInput: document.getElementById('ttsScriptInput'),
            charCount: document.getElementById('ttsCharCount'),
            speedRange: document.getElementById('ttsSpeedRange'),
            speedVal: document.getElementById('ttsSpeedVal'),
            loadSampleBtn: document.getElementById('loadSampleScriptBtn'),
            synthesizeBtn: document.getElementById('ttsSynthesizeBtn'),
            btnText: document.getElementById('ttsBtnText'),
            statusBadge: document.getElementById('ttsStatusBadge'),
            audioElement: document.getElementById('ttsAudioElement'),
            playPauseBtn: document.getElementById('ttsPlayPauseBtn'),
            playIcon: document.getElementById('ttsPlayIcon'),
            seeker: document.getElementById('ttsSeeker'),
            currentTime: document.getElementById('ttsCurrentTime'),
            totalDuration: document.getElementById('ttsTotalDuration'),
            waveformContainer: document.getElementById('ttsWaveformContainer'),
            downloadAudioBtn: document.getElementById('ttsDownloadAudioBtn'),
            timestampBox: document.getElementById('ttsTimestampBox'),
            copyAllBtn: document.getElementById('ttsCopyAllBtn'),
            downloadTxtBtn: document.getElementById('ttsDownloadTxtBtn'),
            autoBreakBtn: document.getElementById('ttsAutoBreakBtn')
        };

        await loadVoices();
        setupEventListeners();

        // Make voice reload accessible globally
        window.reloadTTSVoices = loadVoices;
    }

    function updateTimestampTimings(speedRate, actualMediaDuration) {
        if (!rawLinesData || rawLinesData.length === 0) return;
        const rate = Math.max(0.5, Number(speedRate) || 1.0);

        if (actualMediaDuration && actualMediaDuration > 0) {
            currentActualMediaDuration = actualMediaDuration;
        }

        const totalMediaSec = currentActualMediaDuration > 0 ? currentActualMediaDuration : 24.0;
        const totalChars = rawLinesData.reduce((sum, item) => sum + Math.max(10, item.text.length), 0) || 1;

        let curMediaSec = 0;
        ttsParsedLines = rawLinesData.map((item) => {
            const lineFraction = Math.max(10, item.text.length) / totalChars;
            const lineMediaDur = totalMediaSec * lineFraction;

            // Player elapsed time at current speed rate
            const effectiveElapsedSec = curMediaSec / rate;
            const timeStr = formatTime(effectiveElapsedSec);

            const lineObj = {
                text: item.text,
                mediaSeconds: curMediaSec,
                seconds: Math.round(effectiveElapsedSec * 100) / 100,
                timestamp: timeStr,
                formattedLine: `[${timeStr}] ${item.text}`
            };

            curMediaSec += lineMediaDur;
            return lineObj;
        });

        renderTimestampBox();
    }

    async function loadVoices() {
        try {
            const res = await fetch('/api/tts/voices');
            const data = await res.json();
            if (data.success && data.voices) {
                voicesData = data.voices;
                updateVoiceDropdown();
            }
        } catch (err) {
            console.error('Failed to load voices:', err);
        }
    }

    function updateVoiceDropdown() {
        const lang = elements.langSelect.value;
        const available = voicesData[lang] || [];
        elements.voiceSelect.innerHTML = '';

        if (available.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- No custom voices (Create in Voice Cloning) --';
            elements.voiceSelect.appendChild(option);
            return;
        }

        const categoryNames = {
            'Cloned': '✨ សំឡេងផ្ទាល់ខ្លួន (Cloned Voices)',
            'Recap': '🎬 សម្រាយរឿង (Movie & Story Recap)',
            'Character': '🎭 សម្លេងតួអង្គ (Character & Roleplay)',
            'Kids': '👶 សម្លេងក្មេង (Kids & Animation)',
            'General': '🇰🇭 សំឡេងទូទៅ (General Neural Voices)',
            'Education': '📚 វីដេអូអប់រំ & មេរៀន (Education & E-learning)',
            'Documentary': '🎥 ភាពយន្តឯកសារ (Documentary)',
            'Storytelling': '🎙️ និទានរឿង & Podcast (Storytelling)',
            'News': '📺 ព័ត៌មាន (News & Formal)',
            'Entertainment': '⚡ កម្សាន្ត & ពាណិជ្ជកម្ម (Entertainment)'
        };

        const groups = {};
        available.forEach((v) => {
            const cat = v.isCloned ? 'Cloned' : (v.category || 'General');
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(v);
        });

        // If Khmer has distinct categories, render optgroups
        if (lang === 'km') {
            Object.keys(groups).forEach((cat) => {
                const optGroup = document.createElement('optgroup');
                optGroup.label = categoryNames[cat] || cat;

                groups[cat].forEach((v) => {
                    const option = document.createElement('option');
                    option.value = v.id;
                    option.textContent = v.name;
                    if (v.isCloned) {
                        option.classList.add('font-semibold', 'text-cyan-400');
                    }
                    optGroup.appendChild(option);
                });

                elements.voiceSelect.appendChild(optGroup);
            });
        } else {
            // English or other languages
            available.forEach((v) => {
                const option = document.createElement('option');
                option.value = v.id;
                option.textContent = v.name;
                if (v.isCloned) {
                    option.classList.add('font-semibold', 'text-cyan-400');
                }
                elements.voiceSelect.appendChild(option);
            });
        }
    }

    function setupEventListeners() {
        elements.langSelect.addEventListener('change', () => {
            updateVoiceDropdown();
        });

        elements.loadSampleBtn.addEventListener('click', () => {
            const lang = elements.langSelect.value;
            elements.scriptInput.value = SAMPLE_SCRIPTS[lang] || SAMPLE_SCRIPTS.en;
            updateCharCount();
            showToast(`Loaded ${lang.toUpperCase()} sample script`, 'info');
        });

        function updateCharCount() {
            const len = elements.scriptInput.value.length;
            elements.charCount.textContent = `${len} characters`;
        }
        elements.scriptInput.addEventListener('input', updateCharCount);

        // Auto-break lines on Khmer punctuation '។' and '៕'
        setupKhmerAutoBreak(elements.scriptInput, updateCharCount);

        if (elements.autoBreakBtn) {
            elements.autoBreakBtn.addEventListener('click', () => {
                const text = elements.scriptInput.value;
                if (!text || !text.trim()) {
                    showToast('Please enter or paste text first', 'warning');
                    return;
                }
                elements.scriptInput.value = formatKhmerPunctuationBreak(text);
                updateCharCount();
                showToast('បានបំបែកបន្ទាត់តាមសញ្ញា (។) រួចរាល់!', 'success');
            });
        }

        elements.speedRange.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            elements.speedVal.textContent = `${val.toFixed(2)}x`;
            elements.audioElement.playbackRate = val;
            if (elements.audioElement.duration) {
                elements.totalDuration.textContent = formatTime(elements.audioElement.duration / val);
            }
            updateTimestampTimings(val, elements.audioElement.duration);
        });

        elements.synthesizeBtn.addEventListener('click', synthesize);
        elements.playPauseBtn.addEventListener('click', togglePlayback);
        elements.audioElement.addEventListener('timeupdate', onTimeUpdate);
        elements.audioElement.addEventListener('ended', () => {
            updatePlayState(false);
            elements.statusBadge.textContent = 'Finished';
        });

        elements.seeker.addEventListener('input', (e) => {
            const pct = e.target.value / 100;
            if (elements.audioElement.duration) {
                elements.audioElement.currentTime = pct * elements.audioElement.duration;
            }
        });

        elements.downloadAudioBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentAudioDataUri) return;

            const arr = currentAudioDataUri.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `VoxSync_Audio_${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            showToast('Audio file downloaded', 'success');
        });

        elements.copyAllBtn.addEventListener('click', () => {
            if (ttsParsedLines.length === 0) return;
            const fullText = ttsParsedLines.map(l => `[${l.timestamp}] ${l.text}`).join('\n');
            copyTextToClipboard(fullText);
        });

        elements.downloadTxtBtn.addEventListener('click', () => {
            if (ttsParsedLines.length === 0) return;
            const fullText = ttsParsedLines.map(l => `[${l.timestamp}] ${l.text}`).join('\n');
            downloadTextFile('VoxSync_TTS_Timestamps.txt', fullText);
        });
    }

    async function synthesize() {
        const text = elements.scriptInput.value.trim();
        if (!text) {
            showToast('Please enter script text to synthesize.', 'error');
            return;
        }

        const voice = elements.voiceSelect.value;
        const lang = elements.langSelect.value;
        const rate = parseFloat(elements.speedRange.value);

        elements.synthesizeBtn.disabled = true;
        elements.btnText.textContent = 'Synthesizing with AI...';
        elements.statusBadge.textContent = 'Processing...';
        elements.statusBadge.className = 'text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 animate-pulse';

        try {
            const azureKey = localStorage.getItem('voxsync_azure_key') || '';
            const azureRegion = localStorage.getItem('voxsync_azure_region') || 'eastus';

            const res = await fetch('/api/tts/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice, lang, rate, azureKey, azureRegion })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Speech synthesis failed');
            }

            currentAudioDataUri = data.audioDataUri || data.audioUrl;
            elements.audioElement.src = currentAudioDataUri;
            elements.downloadAudioBtn.classList.remove('pointer-events-none', 'opacity-50');

            rawLinesData = data.rawLines || data.timestamps || [];
            updateTimestampTimings(rate, data.duration);

            elements.audioElement.onloadedmetadata = () => {
                const currentRate = parseFloat(elements.speedRange.value) || 1.0;
                elements.audioElement.playbackRate = currentRate;
                const realDuration = elements.audioElement.duration || data.duration || 24;
                const displayTotalSec = realDuration / currentRate;
                elements.totalDuration.textContent = formatTime(displayTotalSec);

                // Calibrate timestamps to 100% exact real audio duration
                updateTimestampTimings(currentRate, realDuration);

                elements.playPauseBtn.disabled = false;
                elements.playPauseBtn.classList.remove('text-slate-500', 'cursor-not-allowed');
                elements.playPauseBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500', 'text-white', 'shadow-lg');

                renderWaveform();
                showToast('Speech & timestamps generated successfully!', 'success');

                elements.statusBadge.textContent = 'Ready';
                elements.statusBadge.className = 'text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50';
            };

        } catch (err) {
            console.error('TTS error:', err);
            showToast(err.message, 'error');
            elements.statusBadge.textContent = 'Error';
            elements.statusBadge.className = 'text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-400';
        } finally {
            elements.synthesizeBtn.disabled = false;
            elements.btnText.textContent = 'Synthesize Speech & Generate Alignment';
        }
    }

    function togglePlayback() {
        if (elements.audioElement.paused) {
            elements.audioElement.play();
            updatePlayState(true);
        } else {
            elements.audioElement.pause();
            updatePlayState(false);
        }
    }

    function updatePlayState(isPlaying) {
        if (isPlaying) {
            elements.playIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />`;
            elements.statusBadge.textContent = 'Playing';
        } else {
            elements.playIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`;
            elements.statusBadge.textContent = 'Paused';
        }
    }

    function onTimeUpdate() {
        const curMedia = elements.audioElement.currentTime;
        const totalMedia = elements.audioElement.duration || 1;
        const currentRate = parseFloat(elements.speedRange.value) || 1.0;

        elements.currentTime.textContent = formatTime(curMedia / currentRate);
        elements.seeker.value = (curMedia / totalMedia) * 100;

        const lineElements = elements.timestampBox.querySelectorAll('.timestamp-line');
        let activeIdx = -1;

        ttsParsedLines.forEach((item, idx) => {
            const checkTime = item.mediaSeconds !== undefined ? item.mediaSeconds : item.seconds;
            if (curMedia >= checkTime - 0.2) {
                activeIdx = idx;
            }
        });

        lineElements.forEach((el, idx) => {
            if (idx === activeIdx) {
                el.classList.add('active-line');
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                el.classList.remove('active-line');
            }
        });
    }

    function renderTimestampBox() {
        if (ttsParsedLines.length === 0) return;
        elements.timestampBox.innerHTML = '';

        ttsParsedLines.forEach((item, idx) => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'timestamp-line py-2 px-3 rounded hover:bg-slate-900/60 cursor-pointer flex items-baseline gap-3 text-slate-300 font-mono text-xs transition-colors';
            lineDiv.dataset.index = idx;
            lineDiv.dataset.seconds = item.seconds;

            lineDiv.innerHTML = `
                <span class="ts-time select-none text-slate-400 font-mono shrink-0 font-medium">[${item.timestamp}]</span>
                <span class="ts-text text-slate-200 leading-relaxed font-sans text-xs">${escapeHtml(item.text)}</span>
            `;

            lineDiv.addEventListener('click', () => {
                if (elements.audioElement.duration) {
                    const seekMediaTime = item.mediaSeconds !== undefined ? item.mediaSeconds : item.seconds;
                    elements.audioElement.currentTime = seekMediaTime;
                    elements.audioElement.play();
                    updatePlayState(true);
                }
            });

            elements.timestampBox.appendChild(lineDiv);
        });
    }

    function renderWaveform() {
        elements.waveformContainer.innerHTML = '';
        const barCount = 36;
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            const h = Math.floor(Math.random() * 80) + 20;
            bar.className = 'w-1 bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-full transition-all duration-150';
            bar.style.height = `${h}%`;
            elements.waveformContainer.appendChild(bar);
        }
    }

    return { init };
})();
