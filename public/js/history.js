/**
 * VoxSync AI Studio - Audio History & Storage Manager
 */

const History = (() => {
    let historyFiles = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let currentlyPlayingAudio = null;
    let currentlyPlayingBtn = null;

    // DOM Elements
    let historyTableBody;
    let historyCountBadge;
    let historyTotalSize;
    let historySearchInput;
    let historyRefreshBtn;
    let historyClearAllBtn;
    let historyEmptyState;
    let filterPills;

    function init() {
        historyTableBody = document.getElementById('historyTableBody');
        historyCountBadge = document.getElementById('historyCountBadge');
        historyTotalSize = document.getElementById('historyTotalSize');
        historySearchInput = document.getElementById('historySearchInput');
        historyRefreshBtn = document.getElementById('historyRefreshBtn');
        historyClearAllBtn = document.getElementById('historyClearAllBtn');
        historyEmptyState = document.getElementById('historyEmptyState');
        filterPills = document.querySelectorAll('.history-filter-pill');

        if (historyRefreshBtn) {
            historyRefreshBtn.addEventListener('click', () => loadHistory(true));
        }

        if (historySearchInput) {
            historySearchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase().trim();
                renderHistory();
            });
        }

        if (filterPills) {
            filterPills.forEach(pill => {
                pill.addEventListener('click', () => {
                    filterPills.forEach(p => {
                        p.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-500');
                        p.classList.add('bg-slate-900/80', 'text-slate-400', 'border-slate-800');
                    });
                    pill.classList.remove('bg-slate-900/80', 'text-slate-400', 'border-slate-800');
                    pill.classList.add('bg-indigo-600', 'text-white', 'border-indigo-500');

                    currentFilter = pill.getAttribute('data-filter') || 'all';
                    renderHistory();
                });
            });
        }

        if (historyClearAllBtn) {
            historyClearAllBtn.addEventListener('click', handleClearAll);
        }
    }

    async function loadHistory(showSuccessToast = false) {
        try {
            if (historyTableBody) {
                historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="py-12 text-center text-slate-500">
                            <div class="flex items-center justify-center gap-2">
                                <svg class="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Loading audio storage history...</span>
                            </div>
                        </td>
                    </tr>
                `;
            }

            const res = await fetch('/api/history');
            const data = await res.json();

            if (data.success) {
                historyFiles = data.files || [];
                if (historyCountBadge) historyCountBadge.textContent = `${data.count} files`;
                if (historyTotalSize) historyTotalSize.textContent = data.totalSizeFormatted || '0 B';
                renderHistory();
                if (showSuccessToast && typeof showToast === 'function') {
                    showToast('History refreshed', 'info');
                }
            } else {
                throw new Error(data.message || 'Failed to fetch history');
            }
        } catch (err) {
            console.error('Error loading history:', err);
            if (historyTableBody) {
                historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="py-8 text-center text-rose-400">
                            Failed to load history: ${err.message}
                        </td>
                    </tr>
                `;
            }
        }
    }

    function renderHistory() {
        if (!historyTableBody) return;

        let filtered = historyFiles.filter(item => {
            // Filter tab check
            if (currentFilter === 'outputs' && item.folder !== 'outputs') return false;
            if (currentFilter === 'uploads' && item.folder !== 'uploads') return false;
            if (currentFilter === 'tts' && !item.fileName.startsWith('tts-')) return false;
            if (currentFilter === 'clone' && !item.fileName.startsWith('clone-')) return false;

            // Search query check
            if (searchQuery) {
                const matchName = item.fileName.toLowerCase().includes(searchQuery);
                const matchCategory = item.category.toLowerCase().includes(searchQuery);
                return matchName || matchCategory;
            }
            return true;
        });

        if (filtered.length === 0) {
            historyTableBody.innerHTML = '';
            if (historyEmptyState) historyEmptyState.classList.remove('hidden');
            return;
        }

        if (historyEmptyState) historyEmptyState.classList.add('hidden');

        historyTableBody.innerHTML = filtered.map(item => {
            const dateStr = new Date(item.createdAt).toLocaleString();
            
            // Badge color based on category
            let badgeClass = 'bg-indigo-950/80 text-indigo-400 border-indigo-800/50';
            let iconSvg = `
                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
            `;

            if (item.category === 'Text to Speech') {
                badgeClass = 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50';
            } else if (item.category === 'Cloned Speech') {
                badgeClass = 'bg-purple-950/80 text-purple-400 border-purple-800/50';
                iconSvg = `
                    <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                `;
            } else if (item.folder === 'uploads') {
                badgeClass = 'bg-amber-950/80 text-amber-400 border-amber-800/50';
                iconSvg = `
                    <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
                    </svg>
                `;
            }

            const protectedBadge = item.isProtected
                ? `<span class="px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-400 border border-emerald-700/50 text-[10px] font-bold" title="Used by a Cloned Voice profile">🛡️ Voice Model Ref</span>`
                : '';

            return `
                <tr class="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors group">
                    <!-- File Info & Category -->
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                                ${iconSvg}
                            </div>
                            <div class="flex flex-col min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="font-mono text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">${item.fileName}</span>
                                    ${protectedBadge}
                                </div>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="px-2 py-0.2 rounded text-[10px] font-medium border ${badgeClass}">${item.category}</span>
                                    <span class="text-[10px] text-slate-500 font-mono">storage/${item.folder}/</span>
                                </div>
                            </div>
                        </div>
                    </td>

                    <!-- File Size -->
                    <td class="py-3 px-4 text-xs font-mono text-slate-300 whitespace-nowrap">
                        ${item.sizeFormatted}
                    </td>

                    <!-- Created Date -->
                    <td class="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                        ${dateStr}
                    </td>

                    <!-- Play Audio Column -->
                    <td class="py-3 px-4 whitespace-nowrap">
                        <button onclick="History.togglePlayAudio('${item.url}', this)" class="p-2 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all border border-slate-700/60 flex items-center gap-1.5 text-xs font-semibold shadow-sm" title="Play audio preview">
                            <svg class="w-4 h-4 play-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span class="play-text">Play</span>
                        </button>
                    </td>

                    <!-- Actions (Download / Delete) -->
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                            <!-- Download Button (Protected against IDM interception) -->
                            <button onclick="History.downloadAudio('${item.url}', '${item.fileName}')" class="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-all border border-slate-700/50" title="Download audio file">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>

                            <!-- Delete Button -->
                            <button onclick="History.handleDeleteFile('${item.folder}', '${item.fileName}', ${item.isProtected})" class="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-950 text-slate-400 hover:text-rose-400 hover:border-rose-700/60 transition-all border border-slate-700/50" title="Delete file">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function togglePlayAudio(url, btn) {
        if (currentlyPlayingAudio && currentlyPlayingBtn === btn) {
            // Toggle pause
            if (!currentlyPlayingAudio.paused) {
                currentlyPlayingAudio.pause();
                btn.querySelector('.play-text').textContent = 'Play';
                btn.classList.remove('bg-rose-600');
                btn.classList.add('bg-slate-800/80');
            } else {
                currentlyPlayingAudio.play();
                btn.querySelector('.play-text').textContent = 'Pause';
                btn.classList.remove('bg-slate-800/80');
                btn.classList.add('bg-rose-600');
            }
            return;
        }

        // Stop existing audio
        if (currentlyPlayingAudio) {
            currentlyPlayingAudio.pause();
            if (currentlyPlayingBtn) {
                currentlyPlayingBtn.querySelector('.play-text').textContent = 'Play';
                currentlyPlayingBtn.classList.remove('bg-rose-600');
                currentlyPlayingBtn.classList.add('bg-slate-800/80');
            }
        }

        const audio = new Audio(url);
        currentlyPlayingAudio = audio;
        currentlyPlayingBtn = btn;

        btn.querySelector('.play-text').textContent = 'Pause';
        btn.classList.remove('bg-slate-800/80');
        btn.classList.add('bg-rose-600');

        audio.play().catch(err => {
            console.error('Audio playback error:', err);
            btn.querySelector('.play-text').textContent = 'Play';
            btn.classList.remove('bg-rose-600');
            btn.classList.add('bg-slate-800/80');
        });

        audio.onended = () => {
            btn.querySelector('.play-text').textContent = 'Play';
            btn.classList.remove('bg-rose-600');
            btn.classList.add('bg-slate-800/80');
            currentlyPlayingAudio = null;
            currentlyPlayingBtn = null;
        };
    }

    async function handleDeleteFile(folder, fileName, isProtected) {
        let msg = `Are you sure you want to delete "${fileName}"?`;
        if (isProtected) {
            msg = `⚠️ WARNING: This file is currently used by a Cloned Voice profile.\nDeleting it may affect voice playback.\n\nDo you really want to force delete it?`;
        }

        if (!confirm(msg)) return;

        try {
            const res = await fetch(`/api/history/${folder}/${fileName}${isProtected ? '?force=true' : ''}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (data.success) {
                if (typeof showToast === 'function') {
                    showToast(`File deleted: ${fileName}`, 'success');
                }
                loadHistory();
            } else {
                alert(`Could not delete file: ${data.message}`);
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert(`Error deleting file: ${err.message}`);
        }
    }

    async function handleClearAll() {
        const confirmed = confirm(
            '⚠️ CLEAR ALL AUDIO STORAGE:\n\nThis will delete all temporary synthesized and uploaded audio files in outputs & uploads.\n(Active Cloned Voice reference samples will be preserved).\n\nProceed?'
        );

        if (!confirmed) return;

        try {
            const res = await fetch('/api/history/clear', {
                method: 'DELETE'
            });
            const data = await res.json();

            if (data.success) {
                if (typeof showToast === 'function') {
                    showToast(data.message || 'Storage cleared successfully', 'success');
                }
                loadHistory();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (err) {
            console.error('Clear all error:', err);
            alert(`Failed to clear storage: ${err.message}`);
        }
    }

    async function downloadAudio(url, fileName) {
        try {
            if (typeof showToast === 'function') {
                showToast(`Downloading "${fileName}"...`, 'info');
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const blob = await res.blob();

            // Convert to Base64 Data URL (100% immune to Windows IDM interception)
            const reader = new FileReader();
            reader.onloadend = function () {
                const base64data = reader.result;
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = base64data;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                }, 500);
                if (typeof showToast === 'function') {
                    showToast(`Downloaded "${fileName}" successfully!`, 'success');
                }
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.error('Download error:', err);
            if (typeof showToast === 'function') {
                showToast(`Download failed: ${err.message}`, 'error');
            }
        }
    }

    return {
        init,
        loadHistory,
        togglePlayAudio,
        handleDeleteFile,
        handleClearAll,
        downloadAudio
    };
})();
