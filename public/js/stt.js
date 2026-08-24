/**
 * VoxSync AI - Speech-to-Text Frontend Module
 */

const STT = (() => {
    let sttAudioBlob = null;
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let micStream = null;
    let micTimerInterval = null;
    let micSeconds = 0;
    let audioContext = null;
    let analyser = null;
    let animFrameId = null;

    let elements = {};

    function init() {
        elements = {
            dropZone: document.getElementById('sttDropZone'),
            fileInput: document.getElementById('sttFileInput'),
            fileName: document.getElementById('sttFileName'),
            micBtn: document.getElementById('sttMicBtn'),
            micPulse: document.getElementById('sttMicPulse'),
            micStatusText: document.getElementById('sttMicStatusText'),
            micTimer: document.getElementById('sttMicTimer'),
            micCanvas: document.getElementById('sttMicCanvas'),
            transcribeBtn: document.getElementById('sttTranscribeBtn'),
            btnText: document.getElementById('sttBtnText'),
            audioPreviewBox: document.getElementById('sttAudioPreviewBox'),
            audioElement: document.getElementById('sttAudioElement'),
            previewAudioName: document.getElementById('sttPreviewAudioName'),
            playPauseBtn: document.getElementById('sttPlayPauseBtn'),
            playIcon: document.getElementById('sttPlayIcon'),
            seeker: document.getElementById('sttSeeker'),
            currentTime: document.getElementById('sttCurrentTime'),
            totalDuration: document.getElementById('sttTotalDuration'),
            resultBox: document.getElementById('sttResultBox'),
            resultBadge: document.getElementById('sttResultBadge'),
            lineCount: document.getElementById('sttLineCount'),
            copyAllBtn: document.getElementById('sttCopyAllBtn'),
            downloadTxtBtn: document.getElementById('sttDownloadTxtBtn')
        };

        setupEventListeners();
    }

    function setupEventListeners() {
        // File Drop & Pick
        elements.dropZone.addEventListener('click', () => elements.fileInput.click());

        elements.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.dropZone.classList.add('border-indigo-500', 'bg-indigo-950/20');
        });

        elements.dropZone.addEventListener('dragleave', () => {
            elements.dropZone.classList.remove('border-indigo-500', 'bg-indigo-950/20');
        });

        elements.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.dropZone.classList.remove('border-indigo-500', 'bg-indigo-950/20');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleSelectedFile(e.dataTransfer.files[0]);
            }
        });

        elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleSelectedFile(e.target.files[0]);
            }
        });

        // Microphone Button
        elements.micBtn.addEventListener('click', () => {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });

        // Audio Player Events
        if (elements.playPauseBtn) {
            elements.playPauseBtn.addEventListener('click', toggleAudioPlay);
        }
        if (elements.audioElement) {
            elements.audioElement.addEventListener('timeupdate', onAudioTimeUpdate);
            elements.audioElement.addEventListener('loadedmetadata', onAudioLoadedMetadata);
            elements.audioElement.addEventListener('ended', onAudioEnded);
        }
        if (elements.seeker) {
            elements.seeker.addEventListener('input', onAudioSeek);
        }

        // Transcribe Action
        elements.transcribeBtn.addEventListener('click', transcribeAudio);

        // Copy & Download actions
        elements.copyAllBtn.addEventListener('click', () => {
            const lines = Array.from(elements.resultBox.querySelectorAll('.stt-line')).map(el => el.textContent.trim());
            if (lines.length === 0) return;
            copyTextToClipboard(lines.join('\n'));
        });

        elements.downloadTxtBtn.addEventListener('click', () => {
            const lines = Array.from(elements.resultBox.querySelectorAll('.stt-line')).map(el => el.textContent.trim());
            if (lines.length === 0) return;
            downloadTextFile('VoxSync_STT_Transcription.txt', lines.join('\n'));
        });
    }

    function toggleAudioPlay() {
        if (!elements.audioElement || !elements.audioElement.src) return;
        if (elements.audioElement.paused) {
            elements.audioElement.play();
            updatePlayState(true);
        } else {
            elements.audioElement.pause();
            updatePlayState(false);
        }
    }

    function updatePlayState(isPlaying) {
        if (!elements.playIcon) return;
        if (isPlaying) {
            elements.playIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />`;
        } else {
            elements.playIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`;
        }
    }

    function onAudioTimeUpdate() {
        if (!elements.audioElement) return;
        const cur = elements.audioElement.currentTime;
        const dur = elements.audioElement.duration || 1;
        if (elements.currentTime) elements.currentTime.textContent = formatTime(cur);
        if (elements.seeker) elements.seeker.value = (cur / dur) * 100;
    }

    function onAudioLoadedMetadata() {
        if (!elements.audioElement) return;
        const dur = elements.audioElement.duration || 0;
        if (elements.totalDuration) elements.totalDuration.textContent = formatTime(dur);
        if (elements.seeker) elements.seeker.value = 0;
    }

    function onAudioEnded() {
        updatePlayState(false);
        if (elements.seeker) elements.seeker.value = 0;
    }

    function onAudioSeek(e) {
        if (!elements.audioElement || !elements.audioElement.duration) return;
        const pct = parseFloat(e.target.value) / 100;
        elements.audioElement.currentTime = pct * elements.audioElement.duration;
    }

    function handleSelectedFile(file) {
        if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|webm|ogg)$/i)) {
            showToast('Please select a valid audio file (.mp3, .wav, .m4a, .webm)', 'error');
            return;
        }

        sttAudioBlob = file;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        elements.fileName.textContent = `File: ${file.name} (${sizeMb} MB)`;
        elements.fileName.classList.remove('hidden');

        // Audio preview
        const audioUrl = URL.createObjectURL(file);
        elements.audioElement.src = audioUrl;
        if (elements.previewAudioName) {
            elements.previewAudioName.textContent = file.name;
        }

        // Enable Play Button
        if (elements.playPauseBtn) {
            elements.playPauseBtn.disabled = false;
            elements.playPauseBtn.className = 'w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer';
        }
        updatePlayState(false);

        enableTranscribeButton();
        showToast('Audio file loaded and ready for transcription', 'info');
    }

    function enableTranscribeButton() {
        elements.transcribeBtn.disabled = false;
        elements.transcribeBtn.className = 'w-full py-3.5 px-6 rounded-xl font-semibold text-white gradient-bg-btn shadow-lg shadow-indigo-500/20 hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer';
        elements.transcribeBtn.querySelector('svg').classList.replace('text-slate-500', 'text-cyan-300');
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
                sttAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(sttAudioBlob);
                elements.audioElement.src = audioUrl;

                const recordedLabel = `Recorded Audio (${formatTime(micSeconds)})`;
                elements.fileName.textContent = recordedLabel;
                elements.fileName.classList.remove('hidden');

                if (elements.previewAudioName) {
                    elements.previewAudioName.textContent = recordedLabel;
                }

                if (elements.playPauseBtn) {
                    elements.playPauseBtn.disabled = false;
                    elements.playPauseBtn.className = 'w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer';
                }
                updatePlayState(false);

                enableTranscribeButton();
            };

            mediaRecorder.start();
            isRecording = true;

            // UI update
            elements.micPulse.classList.remove('hidden');
            elements.micStatusText.textContent = 'Recording live audio... Click mic to stop';
            elements.micStatusText.className = 'text-xs text-rose-400 font-medium animate-pulse';
            elements.micCanvas.classList.remove('hidden');

            // Timer
            micSeconds = 0;
            elements.micTimer.textContent = '00:00';
            micTimerInterval = setInterval(() => {
                micSeconds++;
                elements.micTimer.textContent = formatTime(micSeconds);
            }, 1000);

            // Live visualizer
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(micStream);
            source.connect(analyser);
            analyser.fftSize = 64;
            drawVisualizer();

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
            cancelAnimationFrame(animFrameId);

            elements.micPulse.classList.add('hidden');
            elements.micStatusText.textContent = 'Click microphone to record again';
            elements.micStatusText.className = 'text-xs text-slate-400';
            elements.micCanvas.classList.add('hidden');
            showToast('Recording completed', 'success');
        }
    }

    function drawVisualizer() {
        const canvas = elements.micCanvas;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function draw() {
            animFrameId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                ctx.fillStyle = `rgb(6, 182, 212)`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 2;
            }
        }
        draw();
    }

    async function transcribeAudio() {
        if (!sttAudioBlob) {
            showToast('No audio file loaded or recorded.', 'error');
            return;
        }

        elements.transcribeBtn.disabled = true;
        elements.btnText.textContent = 'Transcribing with AI...';
        elements.resultBadge.textContent = 'AI Processing...';
        elements.resultBadge.className = 'text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 animate-pulse';

        try {
            const formData = new FormData();
            formData.append('audio', sttAudioBlob, 'audio-sample.webm');

            const customApiKey = localStorage.getItem('voxsync_api_key') || '';
            if (customApiKey) {
                formData.append('customApiKey', customApiKey);
            }

            const res = await fetch('/api/stt/transcribe', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Audio transcription failed');
            }

            if (data.warning) {
                showToast(data.warning, 'warning');
            }

            renderSTTResult(data.lines || []);
            showToast('Transcription completed!', 'success');

        } catch (err) {
            console.error('STT error:', err);
            showToast(err.message, 'error');
            elements.resultBadge.textContent = 'Error';
            elements.resultBadge.className = 'text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-400';
        } finally {
            elements.transcribeBtn.disabled = false;
            elements.btnText.textContent = 'Transcribe Audio & Generate Timestamps';
        }
    }

    function renderSTTResult(lines) {
        elements.resultBox.innerHTML = '';

        if (!lines || lines.length === 0) {
            elements.resultBox.innerHTML = `<p class="text-slate-500 italic text-center pt-24 font-sans">No speech detected.</p>`;
            elements.lineCount.textContent = '0 lines detected';
            return;
        }

        lines.forEach((item) => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'stt-line py-2 px-3 rounded hover:bg-slate-900/60 flex items-baseline gap-3 text-slate-300 font-mono text-xs transition-colors cursor-pointer';

            lineDiv.innerHTML = `
                <span class="ts-time select-none text-slate-400 font-mono shrink-0 font-medium">[${item.timestamp}]</span>
                <span class="ts-text text-slate-200 leading-relaxed font-sans text-xs flex-1">${escapeHtml(item.text)}</span>
            `;

            // Click timestamp line to seek audio
            lineDiv.addEventListener('click', () => {
                if (elements.audioElement.duration) {
                    elements.audioElement.currentTime = item.seconds || 0;
                    elements.audioElement.play();
                    updatePlayState(true);
                }
            });

            elements.resultBox.appendChild(lineDiv);
        });

        elements.lineCount.textContent = `${lines.length} lines detected`;
        elements.resultBadge.textContent = 'Completed';
        elements.resultBadge.className = 'text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50';
    }

    return { init };
})();
