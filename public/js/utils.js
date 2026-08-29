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
 * Smart Bilingual Auto-format to break into new lines on sentence-ending punctuation:
 * - Khmer: '។', '៕'
 * - English / Universal: '.', '!', '?'
 *
 * Intelligently preserves:
 * - Abbreviations (e.g. Mr., Mrs., Dr., Prof., e.g., i.e., etc., vs., Inc., Ltd., Jan., Feb., etc.)
 * - Numbers with decimals (e.g. 3.14, $9.99, 10.5, v1.0.0)
 * - Numbered lists / bullets at beginning of line (e.g. 1. , 2. )
 * - Ellipsis (...)
 * - Domains, emails, and file extensions (e.g. example.com, test@mail.com, audio.mp3)
 * - Khmer '។ល។'
 * 
 * @param {string} text
 * @returns {string}
 */
function formatPunctuationAutoBreak(text) {
    if (!text || typeof text !== 'string') return text;

    let processed = text;

    // 1. Protect Khmer "។ល។"
    const TOKEN_KH_ETC = '___KH_ETC_TOKEN___';
    processed = processed.replace(/។ល។/g, TOKEN_KH_ETC);

    // 2. Protect Ellipsis (...)
    const TOKEN_ELLIPSIS = '___ELLIPSIS_TOKEN___';
    processed = processed.replace(/\.{3,}/g, TOKEN_ELLIPSIS);

    // 3. Protect decimals in numbers (e.g. 3.14, 10.5, $19.99, v1.0.0)
    processed = processed.replace(/(\d)\.(\d)/g, '$1___DECIMAL_DOT___$2');

    // 4. Protect common English abbreviations & titles
    const ABBREVIATIONS = [
        'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'St', 'vs', 'e\\.g', 'i\\.e', 'etc',
        'approx', 'apt', 'dept', 'est', 'min', 'max', 'no', 'vol', 'U\\.S', 'U\\.K', 'U\\.N', 'E\\.U',
        'A\\.M', 'P\\.M', 'a\\.m', 'p\\.m', 'Inc', 'Ltd', 'Co', 'Corp', 'Gen', 'Gov',
        'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
    ];
    ABBREVIATIONS.forEach(abbr => {
        const regex = new RegExp(`\\b(${abbr})\\.`, 'gi');
        processed = processed.replace(regex, '$1___ABBR_DOT___');
    });

    // 5. Protect common domain extensions & URLs/emails & file extensions
    processed = processed.replace(/(\w)\.(com|org|net|io|ai|gov|edu|kh|us|uk|de|fr|app|dev|me|info|biz)\b/gi, '$1___DOMAIN_DOT___$2');
    processed = processed.replace(/(\w)\.(mp3|wav|mp4|png|jpg|jpeg|gif|json|js|html|css|txt|pdf|docx?|xlsx?|zip|rar)\b/gi, '$1___EXT_DOT___$2');

    // 6. Protect numbered list prefixes at beginning of line (e.g. "1. ", "2. ")
    processed = processed.replace(/(^|\n)(\s*\d+)\.\s+/g, '$1$2___LIST_DOT___ ');

    // 7. Break lines after Khmer punctuation '។' and '៕'
    processed = processed.replace(/([។៕])[ \t]*(?!\r?\n|$)/g, '$1\n');
    processed = processed.replace(/([។៕])[ \t]+(?=\r?\n)/g, '$1');

    // 8. Break lines after English/Universal punctuation '.', '!', '?' (if followed by space(s) or start of next sentence)
    processed = processed.replace(/([.!?])[ \t]+(?!\r?\n|$)/g, '$1\n');

    // Also handle punctuation followed immediately by quotes e.g. ." or !" or ?"
    processed = processed.replace(/([.!?]["'”’])[ \t]+(?!\r?\n|$)/g, '$1\n');

    // 9. Restore protected tokens
    processed = processed.replace(/___DECIMAL_DOT___/g, '.');
    processed = processed.replace(/___ABBR_DOT___/g, '.');
    processed = processed.replace(/___DOMAIN_DOT___/g, '.');
    processed = processed.replace(/___EXT_DOT___/g, '.');
    processed = processed.replace(/___LIST_DOT___/g, '.');
    processed = processed.replace(new RegExp(TOKEN_ELLIPSIS, 'g'), '...\n');
    processed = processed.replace(/\.\.\.\n\n+/g, '...\n');

    // Handle '។ល។' followed by space/text
    processed = processed.replace(new RegExp(`${TOKEN_KH_ETC}[ \\t]*(?!\\r?\\n|$)`, 'g'), '។ល។\n');
    processed = processed.replace(new RegExp(TOKEN_KH_ETC, 'g'), '។ល។');

    // 10. Clean up trailing spaces per line
    processed = processed.split('\n').map(line => line.trimEnd()).join('\n');

    return processed;
}

// Backwards compatibility alias
const formatKhmerPunctuationBreak = formatPunctuationAutoBreak;

/**
 * Attach auto-break behavior to a textarea for Khmer and English punctuation:
 * - Khmer: '។', '៕'
 * - English / Universal: '.', '!', '?'
 * 
 * Handles:
 * 1. Pasting text with punctuation
 * 2. Typing punctuation directly
 * 3. IME composition completion
 * 
 * @param {HTMLTextAreaElement} textarea
 * @param {Function} onUpdateCallback
 */
function setupAutoBreak(textarea, onUpdateCallback, getEnabledCallback) {
    if (!textarea) return;

    const isEnabled = () => {
        if (typeof getEnabledCallback === 'function') {
            return Boolean(getEnabledCallback());
        }
        return true;
    };

    // 1. Intercept Paste
    textarea.addEventListener('paste', (e) => {
        if (!isEnabled()) return; // Skip auto break when toggle is OFF
        const pasteText = (e.clipboardData || window.clipboardData)?.getData('text');
        if (pasteText && (pasteText.includes('។') || pasteText.includes('៕') || pasteText.includes('.') || pasteText.includes('!') || pasteText.includes('?'))) {
            e.preventDefault();
            const formatted = formatPunctuationAutoBreak(pasteText);
            
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
        if (!isEnabled()) return; // Skip auto break when toggle is OFF
        if (e.isComposing) return;

        // Auto-break on typing Khmer '។' or '៕'
        if (e.inputType === 'insertText' && (e.data === '។' || e.data === '៕')) {
            const start = textarea.selectionStart;
            const textVal = textarea.value;

            const charBefore = textVal.slice(start - 1, start);
            const charAfter = textVal.slice(start, start + 1);

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
        if (!isEnabled()) return; // Skip auto break when toggle is OFF
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

// Backwards compatibility alias
const setupKhmerAutoBreak = setupAutoBreak;

/* Favorite Voices Management */
const FAVORITES_STORAGE_KEY = 'voxsync_favorite_voices';
const DEFAULT_FAVORITE_VOICES = [
    'cloned-1787562721953',
    'cloned-1787566066619',
    'custom-1787646217612-2750',
    'custom-1787646477696-1220',
    'custom-1787646632200-8452'
];

function getFavoriteVoiceIds() {
    try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
        return [...DEFAULT_FAVORITE_VOICES];
    } catch (e) {
        return [...DEFAULT_FAVORITE_VOICES];
    }
}

function isFavoriteVoice(voiceId) {
    if (!voiceId) return false;
    return getFavoriteVoiceIds().includes(voiceId);
}

function toggleFavoriteVoice(voiceId) {
    if (!voiceId) return false;
    const list = getFavoriteVoiceIds();
    const idx = list.indexOf(voiceId);
    let isFav = false;
    if (idx >= 0) {
        list.splice(idx, 1);
        isFav = false;
    } else {
        list.push(voiceId);
        isFav = true;
        // Automatically make favorite voice active in TTS
        addVoiceToTTS(voiceId);
    }
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('voxsync:favoritesChanged', { detail: { voiceId, isFav, list } }));

    // Sync to backend preferences file
    syncVoicePreferencesToServer();
    return isFav;
}

/* Active TTS Voices Management (Voices explicitly enabled by user in TTS dropdown) */
const ACTIVE_TTS_STORAGE_KEY = 'voxsync_active_tts_voices';
const DEFAULT_CORE_VOICES = [
    'cloned-1787562721953',
    'cloned-1787566066619',
    'cloned-1787973055454',
    'custom-1787646217612-2750',
    'custom-1787646477696-1220',
    'custom-1787646632200-8452',
    'custom-1787645811135-4009',
    'km-KH-PisethNeural',
    'km-KH-SreymomNeural',
    'en-US-JennyNeural',
    'en-US-GuyNeural'
];

function getActiveTTSVoiceIds() {
    try {
        const raw = localStorage.getItem(ACTIVE_TTS_STORAGE_KEY);
        const stored = raw ? JSON.parse(raw) : null;
        if (Array.isArray(stored)) {
            return stored;
        }
        return [...DEFAULT_CORE_VOICES];
    } catch (e) {
        return [...DEFAULT_CORE_VOICES];
    }
}

async function syncVoicePreferencesToServer() {
    try {
        const favorites = getFavoriteVoiceIds();
        const activeVoices = getActiveTTSVoiceIds();
        await fetch('/api/tts/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorites, activeVoices })
        });
    } catch (e) {}
}

function isVoiceActiveInTTS(voiceId) {
    if (!voiceId) return false;
    if (voiceId.startsWith('cloned-') || voiceId.startsWith('custom-')) return true;
    const active = getActiveTTSVoiceIds();
    const favs = getFavoriteVoiceIds();
    return active.includes(voiceId) || favs.includes(voiceId) || DEFAULT_CORE_VOICES.includes(voiceId);
}

function addVoiceToTTS(voiceId) {
    if (!voiceId) return;
    const list = getActiveTTSVoiceIds();
    if (!list.includes(voiceId)) {
        list.push(voiceId);
        localStorage.setItem(ACTIVE_TTS_STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('voxsync:activeVoicesChanged', { detail: { voiceId, action: 'add', list } }));
    }
}

function removeVoiceFromTTS(voiceId) {
    if (!voiceId) return;
    let list = getActiveTTSVoiceIds();
    list = list.filter(id => id !== voiceId);
    localStorage.setItem(ACTIVE_TTS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('voxsync:activeVoicesChanged', { detail: { voiceId, action: 'remove', list } }));
}

function toggleVoiceInTTS(voiceId) {
    if (isVoiceActiveInTTS(voiceId) && !DEFAULT_CORE_VOICES.includes(voiceId)) {
        removeVoiceFromTTS(voiceId);
        return false;
    } else {
        addVoiceToTTS(voiceId);
        return true;
    }
}

