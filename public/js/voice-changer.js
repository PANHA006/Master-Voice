/**
 * VoxSync AI - Voice Changer & Speech-to-Speech Morphing Frontend Module
 */

const VoiceChanger = (() => {
    let originalAudioBlob = null;
    let originalAudioUrl = null;
    let transformedAudioDataUri = null;
    let transformedAudioUrl = null;
    let transformedParsedLines = [];
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let micTimerInterval = null;
    let micSeconds = 0;

    let elements = {};

    function init() {
        elements = {
            dropZone: document.getElementById('vcDropZone'),
            fileInput: document.getElementById('vcFileInput'),
            fileName: document.getElementById('vcFileName'),
            micBtn: document.getElementById('vcMicBtn'),
            micPulse: document.getElementById('vcMicPulse'),
            micStatusText: document.getElementById('vcMicStatusText'),
            micTimer: document.getElementById('vcMicTimer'),
            
            // Original Audio Player (Player 1)
            origPlayerContainer: document.getElementById('vcOrigPlayerContainer'),
            origAudioElement: document.getElementById('vcOrigAudioElement'),
            origPlayPauseBtn: document.getElementById('vcOrigPlayPauseBtn'),
            origPlayIcon: document.getElementById('vcOrigPlayIcon'),
            origSeeker: document.getElementById('vcOrigSeeker'),
            origCurrentTime: document.getElementById('vcOrigCurrentTime'),
            origTotalDuration: document.getElementById('vcOrigTotalDuration'),

            // Morph Controls
            presetSelect: document.getElementById('vcPresetSelect'),
            noiseSelect: document.getElementById('vcNoiseSelect'),
            customPitchSlider: document.getElementById('vcCustomPitchSlider'),
            customPitchVal: document.getElementById('vcCustomPitchVal'),
            speedRange: document.getElementById('vcSpeedRange'),
            speedVal: document.getElementById('vcSpeedVal'),
            transformBtn: document.getElementById('vcTransformBtn'),
            btnText: document.getElementById('vcBtnText'),
            statusBadge: document.getElementById('vcStatusBadge'),

            // Transformed Audio Player (Player 2)
            transPlayerContainer: document.getElementById('vcTransPlayerContainer'),
            transAudioElement: document.getElementById('vcTransAudioElement'),
            transPlayPauseBtn: document.getElementById('vcTransPlayPauseBtn'),
            transPlayIcon: document.getElementById('vcTransPlayIcon'),
            transSeeker: document.getElementById('vcTransSeeker'),
            transCurrentTime: document.getElementById('vcTransCurrentTime'),
            transTotalDuration: document.getElementById('vcTransTotalDuration'),
            downloadAudioBtn: document.getElementById('vcDownloadAudioBtn'),

            // Timestamps Box
            timestampBox: document.getElementById('vcTimestampBox'),
            copyAllBtn: document.getElementById('vcCopyAllBtn'),
            downloadTxtBtn: document.getElementById('vcDownloadTxtBtn'),
            downloadSrtBtn: document.getElementById('vcDownloadSrtBtn')
        };

        setupEventListeners();
        setupAudioPlayers();
        loadVoiceModels();

        // Make voice changer models reloadable
        window.reloadVoiceChangerVoices = loadVoiceModels;
    }

    async function loadVoiceModels() {
        try {
            const res = await fetch('/api/tts/voices');
            const data = await res.json();
            if (data.success && data.voices) {
                renderVoiceDropdown(data.voices);
            }
        } catch (err) {
            console.error('Failed to load voice models for voice changer:', err);
        }
    }

    function renderVoiceDropdown(voicesData) {
        if (!elements.presetSelect) return;
        elements.presetSelect.innerHTML = '';

        const categoryNames = {
            'Cloned': '✨ សំឡេងផ្ទាល់ខ្លួន (Cloned Voices)',
            'Recap': '🎬 សម្រាយរឿង (Movie & Story Recap)',
            'Education': '📚 វីដេអូអប់រំ & មេរៀន (Education & E-learning)',
            'Character': '🎭 សម្លេងតួអង្គ (Character & Roleplay)',
            'Kids': '👶 សម្លេងក្មេង (Kids & Animation)',
            'General': '🇰🇭 សំឡេងទូទៅ (General Khmer Neural)',
            'Storytelling': '🎙️ និទានរឿង & Podcast (Storytelling)',
            'Documentary': '🎥 ភាពយន្តឯកសារ (Documentary)',
            'News': '📺 ព័ត៌មាន (News & Formal)',
            'Entertainment': '⚡ កម្សាន្ត & ពាណិជ្ជកម្ម (Entertainment)'
        };

        const kmVoices = voicesData.km || [];
        const enVoices = voicesData.en || [];

        // Khmer Groups
        const groups = {};
        kmVoices.forEach((v) => {
            const cat = v.isCloned ? 'Cloned' : (v.category || 'General');
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(v);
        });

        Object.keys(groups).forEach((cat) => {
            const optGroup = document.createElement('optgroup');
            optGroup.label = categoryNames[cat] || cat;

            groups[cat].forEach((v) => {
                const option = document.createElement('option');
                option.value = v.id;
                option.textContent = v.name;
                if (v.id === 'km-recap-cinema') {
                    option.selected = true;
                }
                optGroup.appendChild(option);
            });

            elements.presetSelect.appendChild(optGroup);
        });

        // English Group
        if (enVoices.length > 0) {
            const enOptGroup = document.createElement('optgroup');
            enOptGroup.label = '🇺🇸 សំឡេងអង់គ្លេស (English Neural Voices)';

            enVoices.forEach((v) => {
                const option = document.createElement('option');
                option.value = v.id;
                option.textContent = v.name;
                enOptGroup.appendChild(option);
            });

            elements.presetSelect.appendChild(enOptGroup);
        }
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function setupEventListeners() {
        // Upload Drag & Drop
        if (elements.dropZone && elements.fileInput) {
            elements.dropZone.addEventListener('click', () => elements.fileInput.click());

            elements.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                elements.dropZone.classList.add('border-rose-500', 'bg-rose-950/20');
            });

            elements.dropZone.addEventListener('dragleave', () => {
                elements.dropZone.classList.remove('border-rose-500', 'bg-rose-950/20');
            });

            elements.dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                elements.dropZone.classList.remove('border-rose-500', 'bg-rose-950/20');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleSelectedFile(e.dataTransfer.files[0]);
                }
            });

            elements.fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleSelectedFile(e.target.files[0]);
                }
            });
        }

        // Live Mic Recording
        if (elements.micBtn) {
            elements.micBtn.addEventListener('click', () => {
                if (!isRecording) {
                    startRecording();
                } else {
                    stopRecording();
                }
            });
        }

        // Pitch Slider
        if (elements.customPitchSlider && elements.customPitchVal) {
            elements.customPitchSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                const prefix = val > 0 ? `+${val}` : `${val}`;
                elements.customPitchVal.textContent = `${prefix} st`;
            });
        }

        // Speed Range
        if (elements.speedRange && elements.speedVal) {
            elements.speedRange.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                elements.speedVal.textContent = `${val.toFixed(2)}x`;
                if (elements.transAudioElement) {
                    elements.transAudioElement.playbackRate = val;
                }
            });
        }

        // Transform Button Click
        if (elements.transformBtn) {
            elements.transformBtn.addEventListener('click', performVoiceTransform);
        }

        // Copy Timestamps
        if (elements.copyAllBtn) {
            elements.copyAllBtn.addEventListener('click', () => {
                if (transformedParsedLines.length === 0) return;
                const fullText = transformedParsedLines.map(l => l.formattedLine).join('\n');
                navigator.clipboard.writeText(fullText).then(() => {
                    showToast('Copied all timestamps to clipboard!', 'success');
                });
            });
        }

        // Download TXT
        if (elements.downloadTxtBtn) {
            elements.downloadTxtBtn.addEventListener('click', () => {
                if (transformedParsedLines.length === 0) return;
                const fullText = transformedParsedLines.map(l => l.formattedLine).join('\n');
                downloadBlobFile(new Blob([fullText], { type: 'text/plain;charset=utf-8' }), 'voxsync-voice-change-timestamps.txt');
            });
        }

        // Download SRT
        if (elements.downloadSrtBtn) {
            elements.downloadSrtBtn.addEventListener('click', () => {
                if (transformedParsedLines.length === 0) return;
                const srtContent = generateSrtContent(transformedParsedLines);
                downloadBlobFile(new Blob([srtContent], { type: 'text/plain;charset=utf-8' }), 'voxsync-voice-change-subtitles.srt');
            });
        }
    }

    function generateSrtContent(lines) {
        let srt = '';
        lines.forEach((line, index) => {
            const startSec = line.seconds || (index * 4);
            const nextSec = (index < lines.length - 1 && lines[index + 1].seconds) ? lines[index + 1].seconds : (startSec + 4);
            const endSec = Math.max(startSec + 1, nextSec);

            srt += `${index + 1}\n`;
            srt += `${formatSrtTime(startSec)} --> ${formatSrtTime(endSec)}\n`;
            srt += `${line.text}\n\n`;
        });
        return srt;
    }

    function formatSrtTime(sec) {
        const hrs = String(Math.floor(sec / 3600)).padStart(2, '0');
        const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
        const secs = String(Math.floor(sec % 60)).padStart(2, '0');
        const millis = String(Math.floor((sec % 1) * 1000)).padStart(3, '0');
        return `${hrs}:${mins}:${secs},${millis}`;
    }

    function downloadBlobFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleSelectedFile(file) {
        if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|aac|webm)$/i.test(file.name)) {
            showToast('Please select a valid audio file (.mp3, .wav, .m4a, .webm)', 'warning');
            return;
        }

        originalAudioBlob = file;
        if (elements.fileName) {
            elements.fileName.textContent = `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
            elements.fileName.classList.remove('hidden');
        }

        loadOriginalAudio(URL.createObjectURL(file));
        showToast('Audio file loaded successfully!', 'info');
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                originalAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                loadOriginalAudio(URL.createObjectURL(originalAudioBlob));
                if (elements.fileName) {
                    elements.fileName.textContent = `Recorded Audio Sample (${micSeconds}s)`;
                    elements.fileName.classList.remove('hidden');
                }
                showToast('Voice recorded successfully! You can play it below.', 'success');
            };

            mediaRecorder.start();
            isRecording = true;
            micSeconds = 0;

            if (elements.micStatusText) elements.micStatusText.textContent = 'Recording (Click to stop)...';
            if (elements.micPulse) elements.micPulse.classList.remove('hidden');
            if (elements.micBtn) elements.micBtn.classList.add('ring-2', 'ring-rose-500');

            micTimerInterval = setInterval(() => {
                micSeconds++;
                if (elements.micTimer) elements.micTimer.textContent = formatTime(micSeconds);
            }, 1000);

        } catch (err) {
            console.error('Microphone error:', err);
            showToast('Microphone access denied or not available.', 'error');
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            clearInterval(micTimerInterval);

            if (elements.micStatusText) elements.micStatusText.textContent = 'Record Voice';
            if (elements.micPulse) elements.micPulse.classList.add('hidden');
            if (elements.micBtn) elements.micBtn.classList.remove('ring-2', 'ring-rose-500');
        }
    }

    function loadOriginalAudio(src) {
        originalAudioUrl = src;
        if (elements.origAudioElement) {
            elements.origAudioElement.src = src;
            elements.origAudioElement.load();
        }
        if (elements.origPlayerContainer) {
            elements.origPlayerContainer.classList.remove('hidden');
        }
    }

    function setupAudioPlayers() {
        // Player 1: Original Audio Player
        if (elements.origAudioElement) {
            elements.origPlayPauseBtn.addEventListener('click', () => {
                if (elements.origAudioElement.paused) {
                    // Pause other player if playing
                    if (elements.transAudioElement) elements.transAudioElement.pause();
                    elements.origAudioElement.play();
                } else {
                    elements.origAudioElement.pause();
                }
            });

            elements.origAudioElement.addEventListener('play', () => {
                elements.origPlayIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />`;
            });

            elements.origAudioElement.addEventListener('pause', () => {
                elements.origPlayIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`;
            });

            elements.origAudioElement.addEventListener('timeupdate', () => {
                const cur = elements.origAudioElement.currentTime;
                const dur = elements.origAudioElement.duration || 1;
                if (elements.origCurrentTime) elements.origCurrentTime.textContent = formatTime(cur);
                if (elements.origSeeker) elements.origSeeker.value = (cur / dur) * 100;
            });

            elements.origAudioElement.addEventListener('loadedmetadata', () => {
                if (elements.origTotalDuration) elements.origTotalDuration.textContent = formatTime(elements.origAudioElement.duration);
            });

            elements.origSeeker.addEventListener('input', (e) => {
                const pct = parseFloat(e.target.value);
                const dur = elements.origAudioElement.duration || 1;
                elements.origAudioElement.currentTime = (pct / 100) * dur;
            });
        }

        // Player 2: Transformed Audio Player
        if (elements.transAudioElement) {
            elements.transPlayPauseBtn.addEventListener('click', () => {
                if (elements.transAudioElement.paused) {
                    // Pause other player if playing
                    if (elements.origAudioElement) elements.origAudioElement.pause();
                    elements.transAudioElement.play();
                } else {
                    elements.transAudioElement.pause();
                }
            });

            elements.transAudioElement.addEventListener('play', () => {
                elements.transPlayIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />`;
            });

            elements.transAudioElement.addEventListener('pause', () => {
                elements.transPlayIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`;
            });

            elements.transAudioElement.addEventListener('timeupdate', () => {
                const cur = elements.transAudioElement.currentTime;
                const dur = elements.transAudioElement.duration || 1;
                if (elements.transCurrentTime) elements.transCurrentTime.textContent = formatTime(cur);
                if (elements.transSeeker) elements.transSeeker.value = (cur / dur) * 100;
                highlightActiveTimestamp(cur);
            });

            elements.transAudioElement.addEventListener('loadedmetadata', () => {
                if (elements.transTotalDuration) elements.transTotalDuration.textContent = formatTime(elements.transAudioElement.duration);
            });

            elements.transSeeker.addEventListener('input', (e) => {
                const pct = parseFloat(e.target.value);
                const dur = elements.transAudioElement.duration || 1;
                elements.transAudioElement.currentTime = (pct / 100) * dur;
            });
        }
    }

    function highlightActiveTimestamp(curSec) {
        if (!elements.timestampBox) return;
        const rows = elements.timestampBox.querySelectorAll('.timestamp-row');
        rows.forEach((row) => {
            const sec = parseFloat(row.dataset.sec || 0);
            const nextSec = parseFloat(row.dataset.nextSec || 999999);
            if (curSec >= sec && curSec < nextSec) {
                row.classList.add('bg-cyan-950/60', 'border-cyan-500/80');
            } else {
                row.classList.remove('bg-cyan-950/60', 'border-cyan-500/80');
            }
        });
    }

    async function performVoiceTransform() {
        if (!originalAudioBlob) {
            showToast('Please record or upload an audio voice sample first!', 'warning');
            return;
        }

        const preset = elements.presetSelect.value;
        const removeNoise = elements.noiseSelect ? elements.noiseSelect.value : 'medium';
        const pitchShift = elements.customPitchSlider ? parseInt(elements.customPitchSlider.value, 10) : 0;
        const speed = elements.speedRange ? parseFloat(elements.speedRange.value) : 1.0;
        const customApiKey = localStorage.getItem('voxsync_api_key') || '';

        setLoading(true);

        const formData = new FormData();
        formData.append('audio', originalAudioBlob, 'input-audio.webm');
        formData.append('voice', preset);
        formData.append('preset', preset);
        formData.append('removeNoise', removeNoise);
        if (pitchShift !== 0) {
            formData.append('pitchShift', pitchShift);
        }
        formData.append('speed', speed);
        if (customApiKey) {
            formData.append('customApiKey', customApiKey);
        }

        try {
            const res = await fetch('/api/voice-changer/transform', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to transform voice audio.');
            }

            transformedAudioUrl = data.audioUrl;
            transformedAudioDataUri = data.audioDataUri;
            transformedParsedLines = data.timestamps || [];

            // Load Transformed Player (Player 2)
            if (elements.transAudioElement) {
                elements.transAudioElement.src = data.audioDataUri || data.audioUrl;
                elements.transAudioElement.load();
            }

            if (elements.transPlayerContainer) {
                elements.transPlayerContainer.classList.remove('hidden');
            }

            if (elements.downloadAudioBtn) {
                elements.downloadAudioBtn.href = data.audioDataUri || data.audioUrl;
                elements.downloadAudioBtn.download = data.fileName || 'transformed-voice.mp3';
            }

            renderTimestamps(transformedParsedLines);
            showToast('Voice transformed successfully preserving exact rhythm & cadence!', 'success');

        } catch (err) {
            console.error('Transform error:', err);
            showToast(`Voice transformation error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }

    function renderTimestamps(lines) {
        if (!elements.timestampBox) return;
        elements.timestampBox.innerHTML = '';

        if (!lines || lines.length === 0) {
            elements.timestampBox.innerHTML = `
                <div class="p-6 text-center text-slate-500 text-xs">
                    No transcript timestamps generated.
                </div>`;
            return;
        }

        lines.forEach((item, index) => {
            const nextSec = (index < lines.length - 1 && lines[index + 1].seconds) ? lines[index + 1].seconds : (item.seconds + 4);
            const row = document.createElement('div');
            row.className = 'timestamp-row p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/60 flex items-start gap-3 cursor-pointer transition-all';
            row.dataset.sec = item.seconds;
            row.dataset.nextSec = nextSec;

            row.innerHTML = `
                <span class="px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-400 text-xs font-mono font-bold shrink-0 border border-cyan-800/60">
                    ${item.timestamp}
                </span>
                <span class="text-xs text-slate-200 leading-relaxed font-sans flex-1">
                    ${item.text}
                </span>
            `;

            row.addEventListener('click', () => {
                if (elements.transAudioElement) {
                    elements.transAudioElement.currentTime = item.seconds;
                    elements.transAudioElement.play();
                }
            });

            elements.timestampBox.appendChild(row);
        });
    }

    function setLoading(isLoading) {
        if (!elements.transformBtn) return;
        elements.transformBtn.disabled = isLoading;
        if (isLoading) {
            if (elements.btnText) elements.btnText.textContent = 'Transforming Speech...';
            if (elements.statusBadge) elements.statusBadge.classList.remove('hidden');
        } else {
            if (elements.btnText) elements.btnText.textContent = 'Transform Voice (កែប្រែសម្លេង)';
            if (elements.statusBadge) elements.statusBadge.classList.add('hidden');
        }
    }

    function showToast(msg, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            console.log(`[Toast ${type}]:`, msg);
        }
    }

    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    VoiceChanger.init();
});
