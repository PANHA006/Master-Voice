/**
 * VoxSync AI - Utility Functions
 */

/* Toast Notification System */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');

    let bgClass = 'bg-slate-900/95 border-slate-700 text-slate-200';
    if (type === 'success') bgClass = 'bg-indigo-950/95 border-indigo-600 text-indigo-100 shadow-indigo-500/20';
    if (type === 'error') bgClass = 'bg-rose-950/95 border-rose-700 text-rose-100 shadow-rose-500/20';
    if (type === 'warning') bgClass = 'bg-amber-950/95 border-amber-700 text-amber-100 shadow-amber-500/20';

    toast.className = `pointer-events-auto px-4 py-3 rounded-xl border text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2.5 transition-all transform translate-y-2 opacity-0 ${bgClass}`;
    
    let iconSvg = `<svg class="w-4 h-4 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    if (type === 'success') {
        iconSvg = `<svg class="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg class="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    }

    toast.innerHTML = `
        ${iconSvg}
        <span class="leading-relaxed">${escapeHtml(message)}</span>
    `;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* Copy text to clipboard with fallback */
async function copyTextToClipboard(text) {
    if (!text) return;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy text', 'error');
    }
}

/* Download text as file */
function downloadTextFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Downloaded ${filename}`, 'success');
}

/* Download audio file via Blob (bypasses external download managers like IDM) */
async function downloadAudioFile(url, filename) {
    try {
        showToast(`Preparing download: ${filename}...`, 'info');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        }, 1000);
        showToast(`Downloaded ${filename} successfully!`, 'success');
    } catch (err) {
        console.error('Download error:', err);
        showToast(`Download failed: ${err.message}`, 'error');
    }
}

/* Format seconds into MM:SS */
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* Escape HTML to prevent XSS */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Auto-format Khmer text to break into new lines on Khmer punctuation signs '។' and '៕'
 * Preserves '។ល។' (etc.) without breaking inside it.
 * @param {string} text
 * @returns {string}
 */
function formatKhmerPunctuationBreak(text) {
    if (!text || typeof text !== 'string') return text;

    const tokenEtc = '___KH_ETC_TOKEN___';
    let processed = text.replace(/។ល។/g, tokenEtc);

    // Break lines after '។' or '៕' if followed by space(s) or non-newline characters
    processed = processed.replace(/([។៕])[ \t]*(?!\r?\n|$)/g, '$1\n');

    // Clean up any extra trailing whitespace before newlines
    processed = processed.replace(/([។៕])[ \t]+(?=\r?\n)/g, '$1');

    // Handle '។ល។' followed by space/text
    processed = processed.replace(new RegExp(`${tokenEtc}[ \\t]*(?!\\r?\\n|$)`, 'g'), '។ល។\n');
    processed = processed.replace(new RegExp(tokenEtc, 'g'), '។ល។');

    return processed;
}

/**
 * Attach auto-break behavior to a textarea for Khmer punctuation '។' and '៕'
 * Handles:
 * 1. Pasting text with '។'
 * 2. Typing '។' directly
 * 3. IME composition completion
 * @param {HTMLTextAreaElement} textarea
 * @param {Function} onUpdateCallback
 */
function setupKhmerAutoBreak(textarea, onUpdateCallback) {
    if (!textarea) return;

    // 1. Intercept Paste
    textarea.addEventListener('paste', (e) => {
        const pasteText = (e.clipboardData || window.clipboardData)?.getData('text');
        if (pasteText && (pasteText.includes('។') || pasteText.includes('៕'))) {
            e.preventDefault();
            const formatted = formatKhmerPunctuationBreak(pasteText);
            
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            
            let inserted = false;
            try {
                inserted = document.execCommand('insertText', false, formatted);
            } catch (err) {
                inserted = false;
            }
            
            if (!inserted) {
                const val = textarea.value;
                textarea.value = val.substring(0, start) + formatted + val.substring(end);
                textarea.selectionStart = start + formatted.length;
                textarea.selectionEnd = start + formatted.length;
            }
            
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            if (typeof onUpdateCallback === 'function') onUpdateCallback();
        }
    });

    // 2. Intercept Direct Typing
    textarea.addEventListener('input', (e) => {
        if (e.isComposing) return;

        if (e.inputType === 'insertText' && (e.data === '។' || e.data === '៕')) {
            const start = textarea.selectionStart;
            const textVal = textarea.value;

            const charBefore = textVal.slice(start - 1, start);
            const charAfter = textVal.slice(start, start + 1);

            // If it's not the middle of "។ល", and next char isn't already a newline
            const twoBefore = textVal.slice(Math.max(0, start - 2), start);
            if (twoBefore !== '។' && (charBefore === '។' || charBefore === '៕') && charAfter !== '\n' && charAfter !== '\r') {
                let inserted = false;
                try {
                    inserted = document.execCommand('insertText', false, '\n');
                } catch (err) {
                    inserted = false;
                }

                if (!inserted) {
                    textarea.value = textVal.substring(0, start) + '\n' + textVal.substring(start);
                    textarea.selectionStart = start + 1;
                    textarea.selectionEnd = start + 1;
                }

                if (typeof onUpdateCallback === 'function') onUpdateCallback();
            }
        }
    });

    // 3. Handle IME composition completion (Khmer keyboards)
    textarea.addEventListener('compositionend', (e) => {
        if (e.data && (e.data.endsWith('។') || e.data.endsWith('៕'))) {
            const start = textarea.selectionStart;
            const textVal = textarea.value;
            const charBefore = textVal.slice(start - 1, start);
            const charAfter = textVal.slice(start, start + 1);

            if ((charBefore === '។' || charBefore === '៕') && charAfter !== '\n' && charAfter !== '\r') {
                let inserted = false;
                try {
                    inserted = document.execCommand('insertText', false, '\n');
                } catch (err) {
                    inserted = false;
                }

                if (!inserted) {
                    textarea.value = textVal.substring(0, start) + '\n' + textVal.substring(start);
                    textarea.selectionStart = start + 1;
                    textarea.selectionEnd = start + 1;
                }

                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                if (typeof onUpdateCallback === 'function') onUpdateCallback();
            }
        }
    });
}

