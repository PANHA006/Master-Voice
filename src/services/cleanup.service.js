const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const VoiceManager = require('../utils/voice-manager.util');

class StorageCleanupService {
    /**
     * Get set of protected file paths (e.g. Reference audio for cloned voices)
     * @returns {Set<string>} Set of normalized absolute file paths
     */
    static getProtectedFilePaths() {
        const protectedPaths = new Set();
        try {
            const clonedVoices = VoiceManager.getClonedVoices();
            clonedVoices.forEach(v => {
                if (v.referenceAudioPath) {
                    protectedPaths.add(path.resolve(v.referenceAudioPath).toLowerCase());
                }
            });
        } catch (err) {
            console.error('[Storage Cleanup] Error reading protected voice paths:', err.message);
        }
        return protectedPaths;
    }

    /**
     * Clean old files in a specific directory
     * @param {string} dirPath Directory to scan
     * @param {number} maxAgeMs Maximum allowed age in milliseconds
     * @param {Set<string>} protectedPaths Set of protected file paths
     * @returns {{ deletedCount: number, freedBytes: number }}
     */
    static cleanDirectory(dirPath, maxAgeMs, protectedPaths) {
        let deletedCount = 0;
        let freedBytes = 0;

        if (!fs.existsSync(dirPath)) {
            return { deletedCount, freedBytes };
        }

        const now = Date.now();
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            // Skip hidden or system files
            if (file.startsWith('.') || file === 'cloned-voices.json') {
                continue;
            }

            const filePath = path.join(dirPath, file);
            const normalizedPath = path.resolve(filePath).toLowerCase();

            // Protect reference voice files
            if (protectedPaths.has(normalizedPath)) {
                continue;
            }

            try {
                const stats = fs.statSync(filePath);
                if (stats.isFile()) {
                    const fileAge = now - stats.mtimeMs;
                    if (fileAge > maxAgeMs) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        freedBytes += stats.size;
                    }
                }
            } catch (fileErr) {
                console.warn(`[Storage Cleanup] Could not remove file ${file}:`, fileErr.message);
            }
        }

        return { deletedCount, freedBytes };
    }

    /**
     * Run clean up on all configured storage directories
     * @param {Object} [options]
     * @param {number} [options.maxAgeHours] File retention period in hours
     * @returns {{ success: boolean, deletedFiles: number, freedMB: string }}
     */
    static runCleanup(options = {}) {
        const maxAgeHours = options.maxAgeHours ?? config.cleanup?.maxAgeHours ?? 24;
        const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
        const protectedPaths = this.getProtectedFilePaths();

        const targets = [config.uploadsDir, config.outputsDir];
        let totalDeleted = 0;
        let totalBytes = 0;

        targets.forEach(dir => {
            const { deletedCount, freedBytes } = this.cleanDirectory(dir, maxAgeMs, protectedPaths);
            totalDeleted += deletedCount;
            totalBytes += freedBytes;
        });

        const freedMB = (totalBytes / (1024 * 1024)).toFixed(2);

        if (totalDeleted > 0) {
            console.log(`🧹 [Storage Cleanup] Cleaned ${totalDeleted} old file(s) (> ${maxAgeHours}h old). Freed ${freedMB} MB.`);
        }

        return {
            success: true,
            deletedFiles: totalDeleted,
            freedMB
        };
    }

    /**
     * Start scheduled background cleanup job
     * @param {Object} [options]
     * @param {number} [options.intervalMinutes] Interval in minutes
     * @param {number} [options.maxAgeHours] Max age in hours
     * @returns {NodeJS.Timeout | null}
     */
    static startScheduler(options = {}) {
        const isEnabled = config.cleanup?.enabled ?? true;
        if (!isEnabled) {
            console.log('ℹ️  [Storage Cleanup] Scheduler is disabled in configuration.');
            return null;
        }

        const intervalMinutes = options.intervalMinutes ?? config.cleanup?.intervalMinutes ?? 60;
        const maxAgeHours = options.maxAgeHours ?? config.cleanup?.maxAgeHours ?? 24;
        const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

        console.log(`⏰ [Storage Cleanup] Scheduler active: Runs every ${intervalMinutes} min (Retains files for ${maxAgeHours}h).`);

        // Run initial cleanup after a short delay (5 seconds after server start)
        const initialTimer = setTimeout(() => {
            try {
                this.runCleanup({ maxAgeHours });
            } catch (err) {
                console.error('[Storage Cleanup] Initial cleanup error:', err.message);
            }
        }, 5000);

        if (initialTimer.unref) initialTimer.unref();

        // Recurring scheduled job
        const intervalTimer = setInterval(() => {
            try {
                this.runCleanup({ maxAgeHours });
            } catch (err) {
                console.error('[Storage Cleanup] Scheduled cleanup error:', err.message);
            }
        }, intervalMs);

        if (intervalTimer.unref) intervalTimer.unref();

        return intervalTimer;
    }
}

module.exports = StorageCleanupService;
