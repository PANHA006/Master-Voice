const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const VoiceManager = require('../utils/voice-manager.util');

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

class HistoryController {
    /**
     * Get all storage audio files from outputs and uploads
     */
    static async getHistory(req, res, next) {
        try {
            const protectedPaths = new Set();
            try {
                const clonedVoices = VoiceManager.getClonedVoices();
                clonedVoices.forEach(v => {
                    if (v.referenceAudioPath) {
                        protectedPaths.add(path.resolve(v.referenceAudioPath).toLowerCase());
                    }
                });
            } catch (_) {}

            const folders = [
                { name: 'outputs', dir: config.outputsDir },
                { name: 'uploads', dir: config.uploadsDir }
            ];

            const fileList = [];

            folders.forEach(({ name: folderName, dir: folderDir }) => {
                if (!fs.existsSync(folderDir)) return;

                const files = fs.readdirSync(folderDir);
                files.forEach(file => {
                    if (file.startsWith('.') || file === 'cloned-voices.json') return;

                    const filePath = path.join(folderDir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (!stats.isFile()) return;

                        const normalizedPath = path.resolve(filePath).toLowerCase();
                        const isProtected = protectedPaths.has(normalizedPath);

                        let category = 'Audio File';
                        if (file.startsWith('tts-')) category = 'Text to Speech';
                        else if (file.startsWith('clone-')) category = 'Cloned Speech';
                        else if (file.startsWith('audio-')) category = 'STT Audio / Upload';
                        else if (folderName === 'outputs') category = 'Synthesized Audio';
                        else category = 'Uploaded Audio';

                        fileList.push({
                            id: `${folderName}-${file}`,
                            fileName: file,
                            folder: folderName,
                            category,
                            size: stats.size,
                            sizeFormatted: formatBytes(stats.size),
                            createdAt: stats.mtime.toISOString(),
                            timestamp: stats.mtimeMs,
                            url: `/storage/${folderName}/${file}`,
                            isProtected
                        });
                    } catch (_) {}
                });
            });

            // Sort newest first
            fileList.sort((a, b) => b.timestamp - a.timestamp);

            const totalBytes = fileList.reduce((sum, f) => sum + f.size, 0);

            return res.json({
                success: true,
                count: fileList.length,
                totalSizeFormatted: formatBytes(totalBytes),
                files: fileList
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Delete a single file from outputs or uploads
     */
    static async deleteFile(req, res, next) {
        try {
            const { folder, fileName } = req.params;
            const { force } = req.query;

            if (folder !== 'outputs' && folder !== 'uploads') {
                return res.status(400).json({ success: false, message: 'Invalid folder specified.' });
            }

            // Security check against directory traversal
            const cleanFileName = path.basename(fileName);
            const targetDir = folder === 'outputs' ? config.outputsDir : config.uploadsDir;
            const targetPath = path.join(targetDir, cleanFileName);

            if (!fs.existsSync(targetPath)) {
                return res.status(404).json({ success: false, message: 'File not found on server.' });
            }

            // Check if file is protected
            const normalizedPath = path.resolve(targetPath).toLowerCase();
            const clonedVoices = VoiceManager.getClonedVoices();
            const isProtected = clonedVoices.some(v => v.referenceAudioPath && path.resolve(v.referenceAudioPath).toLowerCase() === normalizedPath);

            if (isProtected && force !== 'true') {
                return res.status(400).json({
                    success: false,
                    isProtected: true,
                    message: 'This file is currently used as a reference sample for an active Cloned Voice profile.'
                });
            }

            fs.unlinkSync(targetPath);

            return res.json({
                success: true,
                message: `File "${cleanFileName}" deleted successfully.`
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Clear all files in outputs and uploads (skips protected voice references)
     */
    static async clearAll(req, res, next) {
        try {
            const protectedPaths = new Set();
            try {
                const clonedVoices = VoiceManager.getClonedVoices();
                clonedVoices.forEach(v => {
                    if (v.referenceAudioPath) {
                        protectedPaths.add(path.resolve(v.referenceAudioPath).toLowerCase());
                    }
                });
            } catch (_) {}

            const folders = [config.outputsDir, config.uploadsDir];
            let deletedCount = 0;
            let freedBytes = 0;

            folders.forEach(dir => {
                if (!fs.existsSync(dir)) return;
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    if (file.startsWith('.') || file === 'cloned-voices.json') return;
                    const filePath = path.join(dir, file);
                    const normalizedPath = path.resolve(filePath).toLowerCase();

                    if (protectedPaths.has(normalizedPath)) return; // protect reference audio

                    try {
                        const stats = fs.statSync(filePath);
                        if (stats.isFile()) {
                            fs.unlinkSync(filePath);
                            deletedCount++;
                            freedBytes += stats.size;
                        }
                    } catch (_) {}
                });
            });

            return res.json({
                success: true,
                deletedCount,
                freedSizeFormatted: formatBytes(freedBytes),
                message: `Successfully cleared ${deletedCount} audio file(s) (${formatBytes(freedBytes)} freed).`
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Download audio file with proper binary stream headers
     */
    static async downloadFile(req, res, next) {
        try {
            const { folder, fileName } = req.params;
            if (folder !== 'outputs' && folder !== 'uploads') {
                return res.status(400).send('Invalid folder');
            }
            const cleanFileName = path.basename(fileName);
            const targetDir = folder === 'outputs' ? config.outputsDir : config.uploadsDir;
            const targetPath = path.join(targetDir, cleanFileName);

            if (!fs.existsSync(targetPath)) {
                return res.status(404).send('File not found');
            }

            return res.download(targetPath, cleanFileName);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = HistoryController;
