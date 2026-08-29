/**
 * VoxSync AI Studio - Voice & Audio Editor Studio Frontend Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Elements & Controls
    const editorFileInput = document.getElementById('editorFileInput');
    const editorUploadBtn = document.getElementById('editorUploadBtn');
    const editorRecordBtn = document.getElementById('editorRecordBtn');
    const editorRecDot = document.getElementById('editorRecDot');
    const editorRecText = document.getElementById('editorRecText');
    const editorImportLastBtn = document.getElementById('editorImportLastBtn');

    // 1-Click Adobe Audition 5-Step Master & Magic Master
    const editorAuditionMasterBtn = document.getElementById('editorAuditionMasterBtn');
    const editorAuditionSpinner = document.getElementById('editorAuditionSpinner');
    const editorMagicMasterBtn = document.getElementById('editorMagicMasterBtn');
    const editorMagicSpinner = document.getElementById('editorMagicSpinner');

    const editorWaveform = document.getElementById('editorWaveform');
    const editorTimeline = document.getElementById('editorTimeline');
    const editorWaveformEmptyState = document.getElementById('editorWaveformEmptyState');
    const editorLoadedFilename = document.getElementById('editorLoadedFilename');
    const editorTimeDisplay = document.getElementById('editorTimeDisplay');
    const editorSelectionBadge = document.getElementById('editorSelectionBadge');
    const editorRegionRange = document.getElementById('editorRegionRange');
    const editorRegionDuration = document.getElementById('editorRegionDuration');

    const editorPlayPauseBtn = document.getElementById('editorPlayPauseBtn');
    const editorPlayIcon = document.getElementById('editorPlayIcon');
    const editorPlayText = document.getElementById('editorPlayText');
    const editorStopBtn = document.getElementById('editorStopBtn');
    const editorLoopBtn = document.getElementById('editorLoopBtn');
    const editorZoomSlider = document.getElementById('editorZoomSlider');

    const editorTrimSelectionBtn = document.getElementById('editorTrimSelectionBtn');
    const editorDeleteSelectionBtn = document.getElementById('editorDeleteSelectionBtn');
    const editorUndoBtn = document.getElementById('editorUndoBtn');
    const editorRedoBtn = document.getElementById('editorRedoBtn');
    const editorResetBtn = document.getElementById('editorResetBtn');

    // DSP Sliders & Inputs
    const editorStudioTone = document.getElementById('editorStudioTone');
    const editorBass = document.getElementById('editorBass');
    const editorBassVal = document.getElementById('editorBassVal');
    const editorMid = document.getElementById('editorMid');
    const editorMidVal = document.getElementById('editorMidVal');
    const editorTreble = document.getElementById('editorTreble');
    const editorTrebleVal = document.getElementById('editorTrebleVal');

    const editorPitch = document.getElementById('editorPitch');
    const editorPitchVal = document.getElementById('editorPitchVal');
    const editorSpeed = document.getElementById('editorSpeed');
    const editorSpeedVal = document.getElementById('editorSpeedVal');
    const editorResetPitchSpeedBtn = document.getElementById('editorResetPitchSpeedBtn');

    // Step 4 Compression & Step 5 Limiter
    const editorVoiceLeveler = document.getElementById('editorVoiceLeveler');
    const editorCompThreshold = document.getElementById('editorCompThreshold');
    const editorCompRatio = document.getElementById('editorCompRatio');
    const editorLimiterEnabled = document.getElementById('editorLimiterEnabled');
    const editorLimiterCeiling = document.getElementById('editorLimiterCeiling');

    // Step 2 Noise Reduction
    const editorNoiseGate = document.getElementById('editorNoiseGate');
    const editorDenoise = document.getElementById('editorDenoise');
    const editorVolume = document.getElementById('editorVolume');
    const editorVolumeVal = document.getElementById('editorVolumeVal');
    const editorNormalize = document.getElementById('editorNormalize');
    const editorFadeIn = document.getElementById('editorFadeIn');
    const editorFadeOut = document.getElementById('editorFadeOut');
    const editorReverb = document.getElementById('editorReverb');

    const editorFormat = document.getElementById('editorFormat');
    const editorBitrate = document.getElementById('editorBitrate');
    const editorApplyBtn = document.getElementById('editorApplyBtn');
    const editorApplySpinner = document.getElementById('editorApplySpinner');
    const editorApplyText = document.getElementById('editorApplyText');
    const editorDownloadBtn = document.getElementById('editorDownloadBtn');

    // State Variables
    let wavesurfer = null;
    let wsRegions = null;
    let currentRegion = null;
    let loopRegion = false;
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let recTimer = null;
    let recSeconds = 0;

    // History stack for Undo / Redo
    let historyStack = [];
    let historyIndex = -1;
    let originalAudioState = null;

    /**
     * Format seconds to mm:ss.ms
     */
    function formatExactTime(sec) {
        if (isNaN(sec) || sec < 0) sec = 0;
        const mins = Math.floor(sec / 60);
        const secs = Math.floor(sec % 60);
        const ms = Math.floor((sec % 1) * 100);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    }

    /**
     * Initialize WaveSurfer Instance
     */
    function initWaveSurfer() {
        if (wavesurfer) return;

        try {
            if (typeof WaveSurfer === 'undefined') {
                console.warn('WaveSurfer library is not loaded.');
                return;
            }

            // Create WaveSurfer
            wavesurfer = WaveSurfer.create({
                container: '#editorWaveform',
                waveColor: '#4f46e5',
                progressColor: '#10b981',
                cursorColor: '#06b6d4',
                cursorWidth: 2,
                barWidth: 2,
                barGap: 2,
                barRadius: 2,
                height: 100,
                normalize: true,
                plugins: []
            });

            // Initialize Regions Plugin
            if (typeof WaveSurfer.Regions !== 'undefined') {
                wsRegions = WaveSurfer.Regions.create();
                wavesurfer.registerPlugin(wsRegions);
            } else if (typeof RegionsPlugin !== 'undefined') {
                wsRegions = RegionsPlugin.create();
                wavesurfer.registerPlugin(wsRegions);
            }

            // Initialize Timeline Plugin if available
            if (typeof WaveSurfer.Timeline !== 'undefined') {
                const timeline = WaveSurfer.Timeline.create({
                    container: '#editorTimeline',
                    primaryColor: '#94a3b8',
                    secondaryColor: '#64748b',
                    primaryFontColor: '#cbd5e1',
                    secondaryFontColor: '#94a3b8',
                    fontSize: 10
                });
                wavesurfer.registerPlugin(timeline);
            }

            // Setup WaveSurfer Events
            wavesurfer.on('ready', () => {
                const duration = wavesurfer.getDuration();
                editorTimeDisplay.textContent = `00:00.00 / ${formatExactTime(duration)}`;
                setControlsEnabled(true);
                if (editorWaveformEmptyState) editorWaveformEmptyState.classList.add('hidden');

                // Enable region creation by dragging
                if (wsRegions) {
                    wsRegions.enableDragSelection({
                        color: 'rgba(16, 185, 129, 0.25)',
                        drag: true,
                        resize: true
                    });
                }
            });

            wavesurfer.on('play', () => {
                editorPlayText.textContent = 'Pause';
                editorPlayIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
            });

            wavesurfer.on('pause', () => {
                editorPlayText.textContent = 'Play';
                editorPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
            });

            wavesurfer.on('finish', () => {
                if (loopRegion && currentRegion) {
                    currentRegion.play();
                } else {
                    editorPlayText.textContent = 'Play';
                    editorPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
                }
            });

            wavesurfer.on('timeupdate', (currentTime) => {
                const duration = wavesurfer.getDuration();
                editorTimeDisplay.textContent = `${formatExactTime(currentTime)} / ${formatExactTime(duration)}`;

                if (loopRegion && currentRegion) {
                    if (currentTime >= currentRegion.end || currentTime < currentRegion.start) {
                        wavesurfer.setTime(currentRegion.start);
                    }
                }
            });

            // Region Events
            if (wsRegions) {
                wsRegions.on('region-created', (region) => {
                    wsRegions.getRegions().forEach((r) => {
                        if (r.id !== region.id) r.remove();
                    });
                    currentRegion = region;
                    updateRegionDisplay(region);
                });

                wsRegions.on('region-updated', (region) => {
                    currentRegion = region;
                    updateRegionDisplay(region);
                });

                wsRegions.on('region-clicked', (region, e) => {
                    e.stopPropagation();
                    currentRegion = region;
                    region.play();
                });
            }

        } catch (err) {
            console.error('WaveSurfer Initialization Error:', err);
        }
    }

    /**
     * Update visual info for selected region
     */
    function updateRegionDisplay(region) {
        if (!region) {
            editorSelectionBadge.classList.add('hidden');
            editorTrimSelectionBtn.disabled = true;
            editorDeleteSelectionBtn.disabled = true;
            return;
        }

        const dur = (region.end - region.start).toFixed(2);
        editorRegionRange.textContent = `${formatExactTime(region.start)} - ${formatExactTime(region.end)}`;
        editorRegionDuration.textContent = `${dur}s`;
        editorSelectionBadge.classList.remove('hidden');
        editorTrimSelectionBtn.disabled = false;
        editorDeleteSelectionBtn.disabled = false;
    }

    /**
     * Enable or disable UI action buttons
     */
    function setControlsEnabled(enabled) {
        editorPlayPauseBtn.disabled = !enabled;
        editorStopBtn.disabled = !enabled;
        editorLoopBtn.disabled = !enabled;
        editorZoomSlider.disabled = !enabled;
        editorApplyBtn.disabled = !enabled;
        editorDownloadBtn.disabled = !enabled;
        editorResetBtn.disabled = !enabled;
        if (editorMagicMasterBtn) editorMagicMasterBtn.disabled = !enabled;
        if (editorAuditionMasterBtn) editorAuditionMasterBtn.disabled = !enabled;
    }

    /**
     * Load audio URL into editor and manage history
     */
    function loadAudioIntoEditor(audioUrl, filename, isNewSource = true) {
        initWaveSurfer();

        if (!audioUrl) return;

        if (editorLoadedFilename) {
            editorLoadedFilename.textContent = filename || 'Audio Track';
        }

        if (wavesurfer) {
            wavesurfer.load(audioUrl);
        }

        const state = {
            audioUrl,
            filename: filename || 'Track.mp3'
        };

        if (isNewSource) {
            originalAudioState = state;
            historyStack = [state];
            historyIndex = 0;
        } else {
            historyStack = historyStack.slice(0, historyIndex + 1);
            historyStack.push(state);
            historyIndex = historyStack.length - 1;
        }

        updateUndoRedoButtons();
    }

    /**
     * Update state of Undo / Redo buttons
     */
    function updateUndoRedoButtons() {
        editorUndoBtn.disabled = historyIndex <= 0;
        editorRedoBtn.disabled = historyIndex >= historyStack.length - 1;
    }

    // 2. Event Listeners for UI & File Upload

    // File Upload Trigger
    editorUploadBtn.addEventListener('click', () => {
        editorFileInput.click();
    });

    editorFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('audio', file);

        showToast('Uploading audio file...', 'info');

        try {
            const res = await fetch('/api/editor/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            loadAudioIntoEditor(data.audioUrl, file.name, true);
            showToast('Audio loaded successfully!', 'success');
        } catch (err) {
            showToast(`Upload failed: ${err.message}`, 'error');
        } finally {
            editorFileInput.value = '';
        }
    });

    // Microphone Recording
    editorRecordBtn.addEventListener('click', async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'mic-recording.webm');

                    showToast('Processing recording...', 'info');

                    try {
                        const res = await fetch('/api/editor/upload', {
                            method: 'POST',
                            body: formData
                        });
                        const data = await res.json();
                        if (data.success) {
                            loadAudioIntoEditor(data.audioUrl, 'Mic Recording.webm', true);
                            showToast('Recording loaded into editor!', 'success');
                        }
                    } catch (err) {
                        showToast(`Recording upload failed: ${err.message}`, 'error');
                    }
                };

                mediaRecorder.start();
                isRecording = true;
                recSeconds = 0;
                editorRecText.textContent = 'Stop (00:00)';
                editorRecDot.classList.add('animate-ping');
                editorRecordBtn.classList.replace('bg-slate-800', 'bg-rose-900/80');

                recTimer = setInterval(() => {
                    recSeconds++;
                    const m = String(Math.floor(recSeconds / 60)).padStart(2, '0');
                    const s = String(recSeconds % 60).padStart(2, '0');
                    editorRecText.textContent = `Stop (${m}:${s})`;
                }, 1000);

            } catch (err) {
                showToast(`Microphone access error: ${err.message}`, 'error');
            }
        } else {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach((track) => track.stop());
            }
            clearInterval(recTimer);
            isRecording = false;
            editorRecText.textContent = 'Record Mic';
            editorRecDot.classList.remove('animate-ping');
            editorRecordBtn.classList.replace('bg-rose-900/80', 'bg-slate-800');
        }
    });

    // Import Latest TTS / Generated Audio
    editorImportLastBtn.addEventListener('click', async () => {
        try {
            showToast('Fetching latest audio from studio...', 'info');
            const res = await fetch('/api/history');
            const data = await res.json();

            const files = data.outputs || data.files || [];
            if (!files || files.length === 0) {
                showToast('No audio files found in history.', 'warning');
                return;
            }

            const latestFile = files[0];
            loadAudioIntoEditor(latestFile.url, latestFile.filename, true);
            showToast(`Loaded ${latestFile.filename}`, 'success');
        } catch (err) {
            showToast(`Failed to load history: ${err.message}`, 'error');
        }
    });

    // 🎚️ 1-Click Adobe Audition 5-Step Professional Mastering Action
    if (editorAuditionMasterBtn) {
        editorAuditionMasterBtn.addEventListener('click', async () => {
            if (!historyStack[historyIndex]) return;

            const currentState = historyStack[historyIndex];

            if (editorAuditionSpinner) editorAuditionSpinner.classList.remove('hidden');
            editorAuditionMasterBtn.disabled = true;

            const payload = {
                audioUrl: currentState.audioUrl,
                auditionMaster: true,
                studioTone: 'audition_vocal',
                denoise: 'audition_clean',
                noiseGate: true,
                voiceLeveler: true,
                compressorRatio: 3.5,
                compressorThreshold: -18,
                limiterEnabled: true,
                limiterCeiling: -1.0,
                format: editorFormat ? editorFormat.value : 'mp3',
                bitrate: editorBitrate ? editorBitrate.value : '192k'
            };

            await executeProcess(payload, '🎚️ Applying 5-Step Adobe Audition Master (Noise Clean -> Parametric EQ -> Compressor -> Limiter -1.0dB)...');

            if (editorAuditionSpinner) editorAuditionSpinner.classList.add('hidden');
            editorAuditionMasterBtn.disabled = false;
        });
    }

    // ✨ 1-Click Quick Studio Master Action
    if (editorMagicMasterBtn) {
        editorMagicMasterBtn.addEventListener('click', async () => {
            if (!historyStack[historyIndex]) return;

            const currentState = historyStack[historyIndex];

            if (editorMagicSpinner) editorMagicSpinner.classList.remove('hidden');
            editorMagicMasterBtn.disabled = true;

            const payload = {
                audioUrl: currentState.audioUrl,
                magicMaster: true,
                voiceLeveler: true,
                studioTone: (editorStudioTone && editorStudioTone.value !== 'none') ? editorStudioTone.value : 'magic_studio',
                denoise: 'studio',
                noiseGate: true,
                limiterEnabled: true,
                limiterCeiling: -1.0,
                format: editorFormat ? editorFormat.value : 'mp3',
                bitrate: editorBitrate ? editorBitrate.value : '192k'
            };

            await executeProcess(payload, '✨ Applying Quick Studio Master...');

            if (editorMagicSpinner) editorMagicSpinner.classList.add('hidden');
            editorMagicMasterBtn.disabled = false;
        });
    }

    // 3. Playback & Zoom Controls
    editorPlayPauseBtn.addEventListener('click', () => {
        if (!wavesurfer) return;
        wavesurfer.playPause();
    });

    editorStopBtn.addEventListener('click', () => {
        if (!wavesurfer) return;
        wavesurfer.stop();
        editorPlayText.textContent = 'Play';
        editorPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    });

    editorLoopBtn.addEventListener('click', () => {
        loopRegion = !loopRegion;
        if (loopRegion) {
            editorLoopBtn.classList.add('bg-emerald-900/80', 'text-emerald-300', 'border-emerald-700');
            showToast('Loop Region Enabled', 'info');
        } else {
            editorLoopBtn.classList.remove('bg-emerald-900/80', 'text-emerald-300', 'border-emerald-700');
            showToast('Loop Region Disabled', 'info');
        }
    });

    editorZoomSlider.addEventListener('input', (e) => {
        if (!wavesurfer) return;
        wavesurfer.zoom(Number(e.target.value));
    });

    // 4. Live Sliders & Labels
    if (editorBass) {
        editorBass.addEventListener('input', (e) => {
            if (editorBassVal) editorBassVal.textContent = `${e.target.value > 0 ? '+' : ''}${e.target.value}dB`;
        });
    }
    if (editorMid) {
        editorMid.addEventListener('input', (e) => {
            if (editorMidVal) editorMidVal.textContent = `${e.target.value > 0 ? '+' : ''}${e.target.value}dB`;
        });
    }
    if (editorTreble) {
        editorTreble.addEventListener('input', (e) => {
            if (editorTrebleVal) editorTrebleVal.textContent = `${e.target.value > 0 ? '+' : ''}${e.target.value}dB`;
        });
    }

    editorPitch.addEventListener('input', (e) => {
        const val = e.target.value;
        editorPitchVal.textContent = `${val > 0 ? '+' : ''}${val} st`;
    });

    editorSpeed.addEventListener('input', (e) => {
        editorSpeedVal.textContent = `${Number(e.target.value).toFixed(2)}x`;
    });

    editorVolume.addEventListener('input', (e) => {
        editorVolumeVal.textContent = `${Math.round(e.target.value * 100)}%`;
    });

    editorResetPitchSpeedBtn.addEventListener('click', () => {
        editorPitch.value = 0;
        editorPitchVal.textContent = '0 st';
        editorSpeed.value = 1.0;
        editorSpeedVal.textContent = '1.0x';
        if (editorBass) { editorBass.value = 0; if (editorBassVal) editorBassVal.textContent = '0dB'; }
        if (editorMid) { editorMid.value = 0; if (editorMidVal) editorMidVal.textContent = '0dB'; }
        if (editorTreble) { editorTreble.value = 0; if (editorTrebleVal) editorTrebleVal.textContent = '0dB'; }
        if (editorStudioTone) editorStudioTone.value = 'audition_vocal';
    });

    // 5. Trim & Slicing Action Handlers

    // Keep Selected Region (Trim)
    editorTrimSelectionBtn.addEventListener('click', async () => {
        if (!currentRegion || !historyStack[historyIndex]) return;

        const currentState = historyStack[historyIndex];
        const startTime = currentRegion.start;
        const endTime = currentRegion.end;

        await executeProcess({
            audioUrl: currentState.audioUrl,
            startTime,
            endTime,
            cutMode: 'keep_selection',
            totalDuration: wavesurfer ? wavesurfer.getDuration() : undefined
        }, 'Keeping selected region...');
    });

    // Delete Selected Region
    editorDeleteSelectionBtn.addEventListener('click', async () => {
        if (!currentRegion || !historyStack[historyIndex]) return;

        const currentState = historyStack[historyIndex];
        const startTime = currentRegion.start;
        const endTime = currentRegion.end;
        const totalDuration = wavesurfer ? wavesurfer.getDuration() : undefined;

        await executeProcess({
            audioUrl: currentState.audioUrl,
            startTime,
            endTime,
            cutMode: 'remove_selection',
            totalDuration
        }, 'Removing selected region...');
    });

    // Apply All Effects & Tuning
    editorApplyBtn.addEventListener('click', async () => {
        if (!historyStack[historyIndex]) return;

        const currentState = historyStack[historyIndex];

        const payload = {
            audioUrl: currentState.audioUrl,
            studioTone: editorStudioTone ? editorStudioTone.value : 'audition_vocal',
            bass: editorBass ? Number(editorBass.value) : 0,
            mid: editorMid ? Number(editorMid.value) : 0,
            treble: editorTreble ? Number(editorTreble.value) : 0,
            voiceLeveler: editorVoiceLeveler ? editorVoiceLeveler.checked : false,
            compressorRatio: editorCompRatio ? Number(editorCompRatio.value) : 3.5,
            compressorThreshold: editorCompThreshold ? Number(editorCompThreshold.value) : -18,
            limiterEnabled: editorLimiterEnabled ? editorLimiterEnabled.checked : true,
            limiterCeiling: editorLimiterCeiling ? Number(editorLimiterCeiling.value) : -1.0,
            noiseGate: editorNoiseGate ? editorNoiseGate.checked : false,
            pitchShift: Number(editorPitch.value),
            speed: Number(editorSpeed.value),
            volume: Number(editorVolume.value),
            normalize: editorNormalize ? editorNormalize.checked : false,
            denoise: editorDenoise ? editorDenoise.value : 'audition_clean',
            fadeIn: Number(editorFadeIn.value),
            fadeOut: Number(editorFadeOut.value),
            reverb: editorReverb ? editorReverb.checked : false,
            format: editorFormat ? editorFormat.value : 'mp3',
            bitrate: editorBitrate ? editorBitrate.value : '192k'
        };

        // Include region if selection exists
        if (currentRegion) {
            payload.startTime = currentRegion.start;
            payload.endTime = currentRegion.end;
            payload.cutMode = 'keep_selection';
        }

        await executeProcess(payload, 'Applying audio DSP processing...');
    });

    /**
     * Send processing request to backend
     */
    async function executeProcess(payload, loadingMsg = 'Processing audio...') {
        if (!payload.filename && historyStack[historyIndex]) {
            payload.filename = historyStack[historyIndex].filename;
        }
        if (!payload.audioUrl && historyStack[historyIndex]) {
            payload.audioUrl = historyStack[historyIndex].audioUrl;
        }

        editorApplyBtn.disabled = true;
        editorApplySpinner.classList.remove('hidden');
        editorApplyText.textContent = 'Processing...';

        showToast(loadingMsg, 'info');

        try {
            const res = await fetch('/api/editor/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || 'Audio processing failed');
            }

            // Remove region after trim
            if (wsRegions && currentRegion) {
                wsRegions.clearRegions();
                currentRegion = null;
                updateRegionDisplay(null);
            }

            loadAudioIntoEditor(data.audioUrl, data.filename, false);
            showToast('Audio processed successfully!', 'success');

        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            editorApplyBtn.disabled = false;
            editorApplySpinner.classList.add('hidden');
            editorApplyText.textContent = '⚡ Apply Effects & Process';
        }
    }

    // 6. Undo, Redo & Reset Handlers
    editorUndoBtn.addEventListener('click', () => {
        if (historyIndex > 0) {
            historyIndex--;
            const state = historyStack[historyIndex];
            loadAudioIntoEditor(state.audioUrl, state.filename, false);
            updateUndoRedoButtons();
            showToast('Undo successful', 'info');
        }
    });

    editorRedoBtn.addEventListener('click', () => {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            const state = historyStack[historyIndex];
            loadAudioIntoEditor(state.audioUrl, state.filename, false);
            updateUndoRedoButtons();
            showToast('Redo successful', 'info');
        }
    });

    editorResetBtn.addEventListener('click', () => {
        if (originalAudioState) {
            loadAudioIntoEditor(originalAudioState.audioUrl, originalAudioState.filename, true);
            showToast('Reset to original audio source', 'info');
        }
    });

    // 7. Download Handler
    editorDownloadBtn.addEventListener('click', () => {
        if (!historyStack[historyIndex]) return;
        const currentUrl = historyStack[historyIndex].audioUrl;
        const a = document.createElement('a');
        a.href = currentUrl;
        a.download = historyStack[historyIndex].filename || 'mastered-audio.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Download started!', 'success');
    });

    // Expose global helper to load audio from other tabs if needed
    window.loadAudioToVoiceEditor = (audioUrl, filename) => {
        const tabEditorBtn = document.getElementById('tabEditorBtn');
        if (tabEditorBtn) tabEditorBtn.click();
        loadAudioIntoEditor(audioUrl, filename, true);
    };
});
