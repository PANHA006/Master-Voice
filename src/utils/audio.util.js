const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');

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
    const bytes = buffer.length;
    const bits = bytes * 8;
    const bps = bitrateKbps * 1000;
    return bits / bps;
}

/**
 * Convert any audio file (e.g. .webm, .ogg, .m4a) to clean .mp3 (192kbps)
 * @param {string} inputFilePath
 * @returns {Promise<{ filePath: string, filename: string }>}
 */
function convertToMp3(inputFilePath) {
    return new Promise((resolve, reject) => {
        if (!inputFilePath || !fs.existsSync(inputFilePath)) {
            return reject(new Error('Input audio file not found.'));
        }

        const ext = path.extname(inputFilePath).toLowerCase();
        if (ext === '.mp3') {
            return resolve({
                filePath: inputFilePath,
                filename: path.basename(inputFilePath)
            });
        }

        const dir = path.dirname(inputFilePath);
        const baseNameWithoutExt = path.basename(inputFilePath, ext);
        const outputFilename = `${baseNameWithoutExt}.mp3`;
        const outputFilePath = path.join(dir, outputFilename);

        // -vn disables video stream recording and extracts pure high-fidelity audio
        const args = ['-y', '-i', inputFilePath, '-vn', '-c:a', 'libmp3lame', '-ar', '44100', '-b:a', '192k', outputFilePath];

        execFile(ffmpeg, args, { windowsHide: true }, (err, stdout, stderr) => {
            if (err || !fs.existsSync(outputFilePath)) {
                console.warn('FFmpeg MP3/Audio extraction warning - retaining original:', stderr || err?.message);
                return resolve({
                    filePath: inputFilePath,
                    filename: path.basename(inputFilePath)
                });
            }

            // Safely delete original temp video/audio file
            safeDeleteFile(inputFilePath);

            resolve({
                filePath: outputFilePath,
                filename: outputFilename
            });
        });
    });
}

module.exports = {
    ensureDir,
    safeDeleteFile,
    estimateMp3Duration,
    convertToMp3
};
