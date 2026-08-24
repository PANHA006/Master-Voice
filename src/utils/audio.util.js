const fs = require('fs');
const path = require('path');

/**
 * Ensure directory exists
 * @param {string} dirPath
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Delete a file safely without throwing
 * @param {string} filePath
 */
function safeDeleteFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error(`Failed to delete temp file ${filePath}:`, err.message);
    }
}

/**
 * Estimate audio duration in seconds from MP3 buffer size and bitrate
 * @param {Buffer} buffer
 * @param {number} bitrateKbps
 * @returns {number} duration in seconds
 */
function estimateMp3Duration(buffer, bitrateKbps = 128) {
    if (!buffer || buffer.length === 0) return 0;
    // duration in seconds = (file size in bits) / (bitrate in bps)
    const bytes = buffer.length;
    const bits = bytes * 8;
    const bps = bitrateKbps * 1000;
    return bits / bps;
}

module.exports = {
    ensureDir,
    safeDeleteFile,
    estimateMp3Duration
};
