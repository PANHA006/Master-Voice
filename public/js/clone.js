/**
 * VoxSync AI - Voice Cloning Frontend Module
 */

const CloneVoice = (() => {
    let referenceAudioBlob = null;
    let cloneParsedLines = [];
    let rawLinesData = [];
    let currentAudioDataUri = null;

    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let micStream = null;
    let micTimerInterval = null;
    let micSeconds = 0;

    let currentActualMediaDuration = 0;
    let elements = {};

    function updateTimestampTimings(speedRate, actualMediaDuration) {
        if (!rawLinesData || rawLinesData.length === 0) return;
        const rate = Math.max(0.5, Number(speedRate) || 1.0);

        if (actualMediaDuration && actualMediaDuration > 0) {
            currentActualMediaDuration = actualMediaDuration;
        }

        const totalMediaSec = currentActualMediaDuration > 0 ? currentActualMediaDuration : 24.0;
        const totalChars = rawLinesData.reduce((sum, item) => sum + Math.max(10, item.text.length), 0) || 1;

        let curMediaSec = 0;
        cloneParsedLines = rawLinesData.map((item) => {
            const lineFraction = Math.max(10, item.text.length) / totalChars;
            const lineMediaDur = totalMediaSec * lineFraction;

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

    function init() {
        elements = {
            dropZone: document.getElementById('cloneDropZone'),
            fileInput: document.getElementById('cloneFileInput'),
            fileName: document.getElementById('cloneFileName'),
            micBtn: document.getElementById('cloneMicBtn'),
            micPulse: document.getElementById('cloneMicPulse'),
            micStatusText: document.getElementById('cloneMicStatusText'),
            micTimer: document.getElementById('cloneMicTimer'),
            audioPreviewBox: document.getElementById('cloneAudioPreviewBox'),
            audioPreviewElement: document.getElementById('cloneAudioPreviewElement'),
            previewAudioName: document.getElementById('clonePreviewAudioName'),
            refPlayPauseBtn: document.getElementById('cloneRefPlayPauseBtn'),
            refPlayIcon: document.getElementById('cloneRefPlayIcon'),
            refSeeker: document.getElementById('cloneRefSeeker'),
            refCurrentTime: document.getElementById('cloneRefCurrentTime'),
            refTotalDuration: document.getElementById('cloneRefTotalDuration'),
            voiceNameInput: document.getElementById('cloneVoiceNameInput'),
            langSelect: document.getElementById('cloneLangSelect'),
            processBtn: document.getElementById('cloneProcessBtn'),
            processBtnText: document.getElementById('cloneProcessBtnText'),
            processBadge: document.getElementById('cloneProcessBadge'),
            scriptInput: document.getElementById('cloneScriptInput'),
            loadSampleBtn: document.getElementById('cloneLoadSampleBtn'),
            synthesizeBtn: document.getElementById('cloneSynthesizeBtn'),
            btnText: document.getElementById('cloneBtnText'),
            saveModelBtn: document.getElementById('cloneSaveModelBtn'),
            saveBtnText: document.getElementById('cloneSaveBtnText'),
            resetBtn: document.getElementById('cloneResetBtn'),
            statusBadge: document.getElementById('cloneStatusBadge'),
            audioElement: document.getElementById('cloneAudioElement'),
            playPauseBtn: document.getElementById('clonePlayPauseBtn'),
            playIcon: document.getElementById('clonePlayIcon'),
            cloneSpeedRange: document.getElementById('cloneSpeedRange'),
            cloneSpeedVal: document.getElementById('cloneSpeedVal'),
            seeker: document.getElementById('cloneSeeker'),
            currentTime: document.getElementById('cloneCurrentTime'),
            totalDuration: document.getElementById('cloneTotalDuration'),
            waveformContainer: document.getElementById('cloneWaveformContainer'),
            downloadAudioBtn: document.getElementById('cloneDownloadAudioBtn'),
            timestampBox: document.getElementById('cloneTimestampBox'),
            copyAllBtn: document.getElementById('cloneCopyAllBtn'),
            downloadTxtBtn: document.getElementById('cloneDownloadTxtBtn'),
            autoBreakBtn: document.getElementById('cloneAutoBreakBtn'),
            manageVoicesBtn: document.getElementById('manageClonedVoicesBtn'),
            clonedVoicesModal: document.getElementById('clonedVoicesModal'),
            closeClonedVoicesBtn: document.getElementById('closeClonedVoicesBtn'),
            doneClonedVoicesBtn: document.getElementById('doneClonedVoicesBtn'),
            clonedVoicesList: document.getElementById('clonedVoicesList'),
            clearAllClonedVoicesBtn: document.getElementById('clearAllClonedVoicesBtn')
        };

        setupEventListeners();
        setupVoiceManagerModal();
    }

    let processedReferenceAudioPath = null;
    let isVoiceProcessed = false;

    function setupEventListeners() {
        elements.dropZone.addEventListener('click', () => elements.fileInput.click());

        elements.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.dropZone.classList.add('border-cyan-500', 'bg-cyan-950/20');
        });

        elements.dropZone.addEventListener('dragleave', () => {
            elements.dropZone.classList.remove('border-cyan-500', 'bg-cyan-950/20');
        });

        elements.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.dropZone.classList.remove('border-cyan-500', 'bg-cyan-950/20');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleSelectedReferenceFile(e.dataTransfer.files[0]);
            }
        });

        elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleSelectedReferenceFile(e.target.files[0]);
            }
        });

        elements.micBtn.addEventListener('click', () => {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });

        // Auto-break lines on Khmer punctuation '។' and '៕'
        setupKhmerAutoBreak(elements.scriptInput);

        if (elements.autoBreakBtn) {
            elements.autoBreakBtn.addEventListener('click', () => {
                const text = elements.scriptInput.value;
                if (!text || !text.trim()) {
                    showToast('Please enter or paste text first', 'warning');
                    return;
                }
                elements.scriptInput.value = formatKhmerPunctuationBreak(text);
                showToast('បានបំបែកបន្ទាត់តាមសញ្ញា (។) រួចរាល់!', 'success');
            });
        }

        if (elements.loadSampleBtn) {
            elements.loadSampleBtn.addEventListener('click', () => {
                const lang = elements.langSelect.value;
                if (lang === 'km') {
                    elements.scriptInput.value = `សូមស្វាគមន៍មកកាន់ VoxSync AI មុខងារចម្លងសំឡេង (Voice Cloning)។
សំឡេងនេះត្រូវបានបង្កើតឡើងដោយផ្អែកលើសំឡេងគំរូរបស់អ្នក។
អ្នកអាចប្រើប្រាស់វាសម្រាប់បង្កើត Subtitle និងវីដេអូបានយ៉ាងរលូន។`;
                } else {
                    elements.scriptInput.value = `Hello and welcome! This speech was synthesized using your custom cloned voice profile.
Enjoy crystal-clear speech with synchronized, interactive timestamps.`;
                }
                showToast(`Loaded ${lang.toUpperCase()} sample script`, 'info');
            });
        }

        if (elements.cloneSpeedRange) {
            elements.cloneSpeedRange.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (elements.cloneSpeedVal) elements.cloneSpeedVal.textContent = `${val.toFixed(2)}x`;
                elements.audioElement.playbackRate = val;
                updateTimestampTimings(val);
            });
        }

        // Phase 1: Process Clone Button
        if (elements.processBtn) {
            elements.processBtn.addEventListener('click', processCloneVoice);
        }

        // Phase 2: Test Synthesize Button
        if (elements.synthesizeBtn) {
            elements.synthesizeBtn.addEventListener('click', testSynthesizeVoice);
        }

        // Phase 3: Save Model Button
        if (elements.saveModelBtn) {
            elements.saveModelBtn.addEventListener('click', saveVoiceModel);
        }

        // Reset Button
        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', resetCloneForm);
        }

        // Custom Reference Audio Preview Controls
        if (elements.refPlayPauseBtn && elements.audioPreviewElement) {
            elements.refPlayPauseBtn.addEventListener('click', toggleRefPlayback);
            elements.audioPreviewElement.addEventListener('timeupdate', onRefTimeUpdate);
            elements.audioPreviewElement.addEventListener('loadedmetadata', () => {
                const total = elements.audioPreviewElement.duration || 0;
                if (elements.refTotalDuration) elements.refTotalDuration.textContent = formatTime(total);
            });
            elements.audioPreviewElement.addEventListener('ended', () => {
                updateRefPlayState(false);
            });
        }

        if (elements.refSeeker && elements.audioPreviewElement) {
            elements.refSeeker.addEventListener('input', (e) => {
                const pct = e.target.value / 100;
                if (elements.audioPreviewElement.duration) {
                    elements.audioPreviewElement.currentTime = pct * elements.audioPreviewElement.duration;
                }
            });
        }

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
            a.download = `VoxSync_ClonedVoice_${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            showToast('Cloned audio downloaded', 'success');
        });

        elements.copyAllBtn.addEventListener('click', () => {
            if (cloneParsedLines.length === 0) return;
            const fullText = cloneParsedLines.map(l => `[${l.timestamp}] ${l.text}`).join('\n');
            copyTextToClipboard(fullText);
        });

        elements.downloadTxtBtn.addEventListener('click', () => {
            if (cloneParsedLines.length === 0) return;
            const fullText = cloneParsedLines.map(l => `[${l.timestamp}] ${l.text}`).join('\n');
            downloadTextFile('VoxSync_Cloned_Timestamps.txt', fullText);
        });
    }

    function toggleRefPlayback() {
        if (!elements.audioPreviewElement) return;
        if (elements.audioPreviewElement.paused) {
            elements.audioPreviewElement.play();
            updateRefPlayState(true);
        } else {
            elements.audioPreviewElement.pause();
            updateRefPlayState(false);
        }
    }

    function updateRefPlayState(isPlaying) {
        if (!elements.refPlayIcon) return;
        if (isPlaying) {
            elements.refPlayIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />`;
        } else {
            elements.refPlayIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`;
        }
    }

    function onRefTimeUpdate() {
        if (!elements.audioPreviewElement) return;
        const cur = elements.audioPreviewElement.currentTime;
        const dur = elements.audioPreviewElement.duration || 1;
        if (elements.refCurrentTime) elements.refCurrentTime.textContent = formatTime(cur);
        if (elements.refSeeker) elements.refSeeker.value = (cur / dur) * 100;
    }

    function handleSelectedReferenceFile(file) {
        if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|webm|ogg)$/i)) {
            showToast('Please select a valid audio file (.mp3, .wav, .m4a, .webm)', 'error');
            return;
        }

        referenceAudioBlob = file;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        elements.fileName.textContent = `Reference: ${file.name} (${sizeMb} MB)`;
        elements.fileName.classList.remove('hidden');

        if (elements.previewAudioName) {
            elements.previewAudioName.textContent = file.name;
        }

        const audioUrl = URL.createObjectURL(file);
        elements.audioPreviewElement.src = audioUrl;
        elements.audioPreviewBox.classList.remove('hidden');
        updateRefPlayState(false);

        // Enable Phase 1 Process button
        enableProcessButton();
        showToast('Reference voice sample loaded! Click "1. Process to Clone Voice" below.', 'info');
    }

    async function startRecording() {
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(micStream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                referenceAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(referenceAudioBlob);
                elements.audioPreviewElement.src = audioUrl;
                elements.audioPreviewBox.classList.remove('hidden');
                updateRefPlayState(false);

                const recLabel = `Recorded Sample (${formatTime(micSeconds)})`;
                elements.fileName.textContent = recLabel;
                elements.fileName.classList.remove('hidden');
                if (elements.previewAudioName) {
                    elements.previewAudioName.textContent = recLabel;
                }

                enableProcessButton();
            };

            mediaRecorder.start();
            isRecording = true;

            elements.micPulse.classList.remove('hidden');
            elements.micStatusText.textContent = 'Recording sample... Speak naturally for 5-15s, then click to stop';
            elements.micStatusText.className = 'text-xs text-rose-400 font-medium animate-pulse';

            micSeconds = 0;
            elements.micTimer.textContent = '00:00';
            micTimerInterval = setInterval(() => {
                micSeconds++;
                elements.micTimer.textContent = formatTime(micSeconds);
            }, 1000);

        } catch (err) {
            console.error('Microphone error:', err);
            showToast('Microphone access denied or unavailable', 'error');
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            micStream.getTracks().forEach(track => track.stop());
            isRecording = false;

            clearInterval(micTimerInterval);

            elements.micPulse.classList.add('hidden');
            elements.micStatusText.textContent = 'Click to record reference audio again';
            elements.micStatusText.className = 'text-xs text-slate-400';
            showToast('Reference sample recording completed', 'success');
        }
    }

    function enableProcessButton() {
        if (!elements.processBtn) return;
        elements.processBtn.disabled = false;
        elements.processBtn.className = 'w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white gradient-bg-btn shadow-md hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer';
        if (elements.processBadge) {
            elements.processBadge.textContent = 'Sample ready';
            elements.processBadge.className = 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50';
        }
    }

    // Phase 1: Process & Clone Voice
    async function processCloneVoice() {
        if (!referenceAudioBlob) {
            showToast('Please upload or record a reference voice sample first.', 'error');
            return;
        }

        const voiceName = elements.voiceNameInput.value.trim() || 'My Cloned Voice';
        const lang = elements.langSelect.value;

        elements.processBtn.disabled = true;
        elements.processBtnText.textContent = 'Processing & copying voice...';

        try {
            const formData = new FormData();
            formData.append('referenceAudio', referenceAudioBlob, 'voice-sample.webm');
            formData.append('voiceName', voiceName);
            formData.append('lang', lang);

            const res = await fetch('/api/clone/process', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    processedReferenceAudioPath = data.referenceAudioPath;
                }
            } else if (res.status === 404) {
                // Graceful fallback if backend endpoint was called before server restarted
                console.warn('/api/clone/process returned 404, using local session');
            }

            isVoiceProcessed = true;

            elements.processBadge.textContent = '✅ Cloned (Ready to Test)';
            elements.processBadge.className = 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50';
            elements.processBtnText.textContent = '✅ Voice Processed & Cloned';
            elements.processBtn.className = 'w-full py-2.5 px-4 rounded-xl font-bold text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center gap-2 cursor-default';

            // Unlock Phase 2 (Test Synthesize button)
            elements.synthesizeBtn.disabled = false;
            elements.synthesizeBtn.className = 'py-2 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md';

            showToast(`Voice "${voiceName}" processed successfully! You can now test it in Step 2.`, 'success');

        } catch (err) {
            console.error('Process error:', err);
            showToast(err.message, 'error');
            elements.processBtn.disabled = false;
            elements.processBtnText.textContent = '⚡ 1. Process to Clone Voice (ដំណើរការចម្លងសំឡេង)';
        }
    }

    // Phase 2: Test Voice Synthesis
    async function testSynthesizeVoice() {
        if (!referenceAudioBlob && !processedReferenceAudioPath) {
            showToast('Please complete Step 1 (Process Voice) first.', 'error');
            return;
        }

        const text = elements.scriptInput.value.trim();
        if (!text) {
            showToast('Please enter script text in Step 2 to test synthesis.', 'error');
            return;
        }

        const voiceName = elements.voiceNameInput.value.trim() || 'My Cloned Voice';
        const lang = elements.langSelect.value;

        elements.synthesizeBtn.disabled = true;
        elements.btnText.textContent = 'Testing synthesis...';
        elements.statusBadge.textContent = 'Testing...';
        elements.statusBadge.className = 'text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 animate-pulse';

        try {
            const formData = new FormData();
            if (referenceAudioBlob) {
                formData.append('referenceAudio', referenceAudioBlob, 'voice-sample.webm');
            }
            if (processedReferenceAudioPath) {
                formData.append('referenceAudioPath', processedReferenceAudioPath);
            }
            formData.append('text', text);
            formData.append('voiceName', voiceName);
            formData.append('lang', lang);

            // Attempt test-synthesize first; if 404, fallback to /api/clone/synthesize
            let res = await fetch('/api/clone/test-synthesize', {
                method: 'POST',
                body: formData
            });

            if (res.status === 404) {
                res = await fetch('/api/clone/synthesize', {
                    method: 'POST',
                    body: formData
                });
            }

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Test synthesis failed');
            }

            currentAudioDataUri = data.audioDataUri || data.audioUrl;
            elements.audioElement.src = currentAudioDataUri;
            elements.downloadAudioBtn.classList.remove('pointer-events-none', 'opacity-50');

            rawLinesData = data.rawLines || data.timestamps || [];
            const currentRate = elements.cloneSpeedRange ? parseFloat(elements.cloneSpeedRange.value) : 1.0;
            updateTimestampTimings(currentRate);

            elements.audioElement.onloadedmetadata = () => {
                const totalSec = elements.audioElement.duration || (data.duration ? data.duration / currentRate : 10);
                elements.totalDuration.textContent = formatTime(totalSec);
                if (elements.cloneSpeedRange) {
                    elements.audioElement.playbackRate = currentRate;
                }

                elements.playPauseBtn.disabled = false;
                elements.playPauseBtn.classList.remove('text-slate-500', 'cursor-not-allowed');
                elements.playPauseBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500', 'text-white', 'shadow-lg');

                renderWaveform();
                showToast('Test speech generated! If satisfied, click "3. Save to Voice Models" below.', 'success');

                elements.statusBadge.textContent = 'Test Ready';
                elements.statusBadge.className = 'text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50';

                // Unlock Phase 3 (Save Model Button)
                if (elements.saveModelBtn) {
                    elements.saveModelBtn.disabled = false;
                    elements.saveModelBtn.className = 'py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer shadow-lg shadow-emerald-500/20';
                    elements.saveBtnText.textContent = '💾 3. Save to Voice Models';
                }
            };

        } catch (err) {
            console.error('Test synthesis error:', err);
            showToast(err.message, 'error');
            elements.statusBadge.textContent = 'Error';
            elements.statusBadge.className = 'text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-400';
        } finally {
            elements.synthesizeBtn.disabled = false;
            elements.btnText.textContent = '▶️ 2. Test Voice Synthesis';
        }
    }

    // Phase 3: Save to Voice Models Registry
    async function saveVoiceModel() {
        if (!processedReferenceAudioPath && !referenceAudioBlob) {
            showToast('No voice sample to save. Please complete Step 1 first.', 'error');
            return;
        }

        const voiceName = elements.voiceNameInput.value.trim() || 'My Cloned Voice';
        const lang = elements.langSelect.value;

        elements.saveModelBtn.disabled = true;
        elements.saveBtnText.textContent = 'Saving to Voice Models...';

        try {
            let refPath = processedReferenceAudioPath;

            // If not yet uploaded persistently, process it first
            if (!refPath && referenceAudioBlob) {
                const formData = new FormData();
                formData.append('referenceAudio', referenceAudioBlob, 'voice-sample.webm');
                formData.append('voiceName', voiceName);
                formData.append('lang', lang);

                const procRes = await fetch('/api/clone/process', { method: 'POST', body: formData });
                const procData = await procRes.json();
                if (procRes.ok && procData.success) {
                    refPath = procData.referenceAudioPath;
                    processedReferenceAudioPath = refPath;
                }
            }

            const res = await fetch('/api/clone/save-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voiceName,
                    lang,
                    referenceAudioPath: refPath
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save voice model');
            }

            elements.saveBtnText.textContent = '✅ Saved to Voice Models';
            elements.saveModelBtn.className = 'py-2.5 px-4 rounded-xl font-bold text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-default';

            showToast(`Voice Model "${voiceName}" saved successfully! You can now select it in Text-to-Speech (TTS).`, 'success');

            // Refresh TTS Voice Dropdown in Tab 1
            if (typeof window.reloadTTSVoices === 'function') {
                window.reloadTTSVoices();
            }

        } catch (err) {
            console.error('Save error:', err);
            showToast(err.message, 'error');
            elements.saveModelBtn.disabled = false;
            elements.saveBtnText.textContent = '💾 3. Save to Voice Models';
        }
    }

    // Reset Form
    function resetCloneForm() {
        referenceAudioBlob = null;
        processedReferenceAudioPath = null;
        isVoiceProcessed = false;
        currentAudioDataUri = null;
        rawLinesData = [];
        cloneParsedLines = [];

        elements.fileInput.value = '';
        elements.fileName.classList.add('hidden');
        elements.audioPreviewBox.classList.add('hidden');
        elements.audioPreviewElement.src = '';
        if (elements.previewAudioName) elements.previewAudioName.textContent = '';
        if (elements.refSeeker) elements.refSeeker.value = 0;
        if (elements.refCurrentTime) elements.refCurrentTime.textContent = '00:00';
        if (elements.refTotalDuration) elements.refTotalDuration.textContent = '00:00';
        updateRefPlayState(false);

        elements.processBtn.disabled = true;
        elements.processBtn.className = 'w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-400 bg-slate-800 border border-slate-700/50 cursor-not-allowed transition-all flex items-center justify-center gap-2';
        elements.processBtnText.textContent = '⚡ 1. Process to Clone Voice (ដំណើរការចម្លងសំឡេង)';
        elements.processBadge.textContent = 'Waiting for sample';
        elements.processBadge.className = 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400';

        elements.scriptInput.value = '';
        elements.synthesizeBtn.disabled = true;
        elements.synthesizeBtn.className = 'py-2 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center gap-1.5 cursor-not-allowed opacity-50 shadow-md';

        elements.saveModelBtn.disabled = true;
        elements.saveModelBtn.className = 'py-2.5 px-4 rounded-xl font-bold text-xs text-slate-400 bg-slate-800 border border-slate-700/50 cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap';
        elements.saveBtnText.textContent = '💾 3. Save to Voice Models';

        elements.audioElement.src = '';
        elements.playPauseBtn.disabled = true;
        elements.playPauseBtn.className = 'p-3 rounded-xl bg-slate-800 text-slate-500 cursor-not-allowed hover:text-white transition-all flex items-center gap-2';
        elements.statusBadge.textContent = 'Idle';
        elements.statusBadge.className = 'text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400';

        elements.timestampBox.innerHTML = `<p class="text-slate-500 italic text-center pt-20 font-sans">No speech synthesized yet. Click "2. Test Voice Synthesis" to generate synced timestamps.</p>`;
        showToast('Voice cloning form reset', 'info');
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
        const currentRate = elements.cloneSpeedRange ? parseFloat(elements.cloneSpeedRange.value) : 1.0;

        elements.currentTime.textContent = formatTime(curMedia / currentRate);
        elements.seeker.value = (curMedia / totalMedia) * 100;

        const lineElements = elements.timestampBox.querySelectorAll('.timestamp-line');
        let activeIdx = -1;

        cloneParsedLines.forEach((item, idx) => {
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
        if (cloneParsedLines.length === 0) return;
        elements.timestampBox.innerHTML = '';

        cloneParsedLines.forEach((item, idx) => {
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

    /* Modal for Managing & Deleting Cloned Voice Profiles */
    function setupVoiceManagerModal() {
        if (!elements.manageVoicesBtn || !elements.clonedVoicesModal) return;

        elements.manageVoicesBtn.addEventListener('click', () => {
            elements.clonedVoicesModal.classList.remove('hidden');
            fetchAndRenderClonedVoices();
        });

        if (elements.closeClonedVoicesBtn) {
            elements.closeClonedVoicesBtn.addEventListener('click', () => {
                elements.clonedVoicesModal.classList.add('hidden');
            });
        }

        if (elements.doneClonedVoicesBtn) {
            elements.doneClonedVoicesBtn.addEventListener('click', () => {
                elements.clonedVoicesModal.classList.add('hidden');
            });
        }

        if (elements.clearAllClonedVoicesBtn) {
            elements.clearAllClonedVoicesBtn.addEventListener('click', handleClearAllClonedVoices);
        }
    }

    async function fetchAndRenderClonedVoices() {
        if (!elements.clonedVoicesList) return;

        elements.clonedVoicesList.innerHTML = `
            <div class="py-10 text-center text-slate-500 text-xs">
                <span>Loading voice profiles...</span>
            </div>
        `;

        try {
            const res = await fetch('/api/clone/voices');
            const data = await res.json();

            if (!data.success || !data.voices || data.voices.length === 0) {
                elements.clonedVoicesList.innerHTML = `
                    <div class="py-12 flex flex-col items-center justify-center gap-2 text-center text-slate-500">
                        <svg class="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        <p class="text-xs font-semibold text-slate-400">No custom cloned voices found</p>
                        <p class="text-[11px] text-slate-600">Create a cloned voice profile to see it here.</p>
                    </div>
                `;
                return;
            }

            elements.clonedVoicesList.innerHTML = data.voices.map(v => {
                const dateStr = v.createdAt ? new Date(v.createdAt).toLocaleDateString() : 'Active';
                const langBadge = v.lang === 'km' 
                    ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">🇰🇭 Khmer</span>'
                    : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-800/50">🇺🇸 English</span>';

                return `
                    <div class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400 shrink-0 text-xs font-bold font-mono shadow-sm">
                                🎙️
                            </div>
                            <div class="flex flex-col min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-xs text-white truncate max-w-[180px] sm:max-w-[240px]">${escapeHtml(v.name)}</span>
                                    ${langBadge}
                                </div>
                                <div class="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                                    <span>ID: ${v.id}</span>
                                    <span>•</span>
                                    <span>${dateStr}</span>
                                </div>
                            </div>
                        </div>

                        <button onclick="CloneVoice.handleDeleteClonedVoice('${v.id}', '${escapeHtml(v.name)}')" class="p-2 rounded-xl bg-slate-900/90 hover:bg-rose-950 text-slate-400 hover:text-rose-400 hover:border-rose-700/60 transition-all border border-slate-800 shrink-0" title="Delete this cloned voice">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                `;
            }).join('');
        } catch (err) {
            elements.clonedVoicesList.innerHTML = `<div class="py-6 text-center text-rose-400 text-xs">Failed to load voices: ${err.message}</div>`;
        }
    }

    async function handleDeleteClonedVoice(id, name) {
        if (!confirm(`Are you sure you want to delete cloned voice "${name}"?\nIt will be removed from your TTS Voice Model list.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/clone/voices/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                if (typeof showToast === 'function') {
                    showToast(`Cloned voice "${name}" deleted!`, 'success');
                }
                fetchAndRenderClonedVoices();
                if (typeof window.reloadTTSVoices === 'function') {
                    window.reloadTTSVoices();
                }
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (err) {
            console.error('Delete voice error:', err);
            alert(`Failed to delete voice: ${err.message}`);
        }
    }

    async function handleClearAllClonedVoices() {
        if (!confirm('⚠️ Are you sure you want to delete ALL custom cloned voice profiles?\nThis cannot be undone.')) {
            return;
        }

        try {
            const res = await fetch('/api/clone/voices/clear', { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                if (typeof showToast === 'function') {
                    showToast('All cloned voices cleared!', 'success');
                }
                fetchAndRenderClonedVoices();
                if (typeof window.reloadTTSVoices === 'function') {
                    window.reloadTTSVoices();
                }
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (err) {
            console.error('Clear voices error:', err);
            alert(`Failed to clear voices: ${err.message}`);
        }
    }

    return {
        init,
        fetchAndRenderClonedVoices,
        handleDeleteClonedVoice,
        handleClearAllClonedVoices
    };
})();
