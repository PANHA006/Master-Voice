/**
 * Format seconds (float or int) to [MM:SS] or MM:SS string
 * @param {number} seconds
 * @param {boolean} withBrackets
 * @returns {string} e.g. "[00:05]" or "00:05"
 */
function formatTime(seconds, withBrackets = false) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return withBrackets ? `[${formatted}]` : formatted;
}

/**
 * Split text into meaningful lines/sentences and remove existing leading brackets
 * @param {string} rawText
 * @returns {string[]}
 */
function splitScriptLines(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    
    // Split by newlines first
    const rawLines = rawText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const cleanLines = [];
    
    rawLines.forEach(line => {
        // Strip leading timestamp like [00:05] or (00:05) or 00:05
        const cleaned = line.replace(/^[\[\(]?\d{1,2}:\d{2}[\]\)]?\s*/, '').trim();
        if (cleaned.length > 0) {
            cleanLines.push(cleaned);
        }
    });

    return cleanLines;
}

/**
 * Calculate proportional start times for each line based on text length and total duration
 * @param {string[]} lines
 * @param {number} totalDurationSec
 * @returns {Array<{timestamp: string, text: string, seconds: number, formattedLine: string}>}
 */
function calculateLineTimestamps(lines, totalDurationSec) {
    if (!lines || lines.length === 0) return [];
    if (!totalDurationSec || totalDurationSec <= 0) totalDurationSec = lines.length * 3;

    const totalChars = lines.reduce((acc, line) => acc + line.length, 0) || 1;
    let currentSec = 0;
    const alignments = [];

    lines.forEach((lineText, index) => {
        const timeFormatted = formatTime(currentSec);
        const lineFraction = lineText.length / totalChars;
        const lineDuration = index === lines.length - 1 
            ? Math.max(1, totalDurationSec - currentSec) 
            : Math.max(1, totalDurationSec * lineFraction);

        alignments.push({
            timestamp: timeFormatted,
            text: lineText,
            seconds: Math.round(currentSec * 100) / 100,
            formattedLine: `[${timeFormatted}] ${lineText}`
        });

        currentSec += lineDuration;
    });

    return alignments;
}

module.exports = {
    formatTime,
    splitScriptLines,
    calculateLineTimestamps
};
