const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const config = require('../config/config');
const { ensureDir } = require('../utils/audio.util');

class EditorService {
    /**
     * Process audio with various DSP and editing operations (including Adobe Audition 5-Step Mastering)
     * @param {Object} options
     * @param {string} options.inputPath - Path to source audio file
     * @param {number} [options.startTime] - Start trim time in seconds
     * @param {number} [options.endTime] - End trim time in seconds
     * @param {string} [options.cutMode] - 'keep_selection' | 'remove_selection'
     * @param {number} [options.totalDuration] - Total audio duration if removing selection
     * @param {boolean} [options.magicMaster] - 1-Click Studio Master
     * @param {boolean} [options.auditionMaster] - Adobe Audition 5-Step Professional Mastering Chain
     * @param {boolean} [options.voiceLeveler] - Auto voice leveling & dynamic compression
     * @param {string} [options.studioTone] - 'none' | 'magic_studio' | 'podcast_warm' | 'recap_punchy' | 'crisp_clear' | 'audition_vocal'
     * @param {boolean} [options.noiseGate] - Adaptive silence noise gate
     * @param {number} [options.pitchShift] - Pitch shift in semitones (-12 to +12)
     * @param {number} [options.speed] - Playback speed factor (0.5 to 2.0)
     * @param {number} [options.volume] - Volume multiplier (e.g. 1.0 = 100%, 1.5 = 150%)
     * @param {boolean} [options.normalize] - Whether to normalize audio peaks
     * @param {boolean} [options.limiterEnabled] - Hard Peak Limiter to prevent clipping
     * @param {number} [options.limiterCeiling] - Peak ceiling in dB (e.g. -1.0, -0.5, -2.0)
     * @param {number} [options.compressorRatio] - Compression ratio (e.g. 3.5, 4.0, 2.0)
     * @param {number} [options.compressorThreshold] - Compression threshold in dB (e.g. -18)
     * @param {number} [options.bass] - Bass gain in dB (-20 to +20)
     * @param {number} [options.mid] - Mid gain in dB (-20 to +20)
     * @param {number} [options.treble] - Treble gain in dB (-20 to +20)
     * @param {string} [options.denoise] - 'none' | 'low' | 'medium' | 'high' | 'studio' | 'audition_clean'
     * @param {number} [options.fadeIn] - Fade in duration in seconds
     * @param {number} [options.fadeOut] - Fade out duration in seconds
     * @param {boolean} [options.reverb] - Enable studio reverb
     * @param {string} [options.format] - 'mp3' | 'wav'
     * @param {string} [options.bitrate] - '128k' | '192k' | '320k'
     * @returns {Promise<{success: boolean, audioUrl: string, filename: string, duration: number}>}
     */
    static async processAudio(options) {
        const {
            inputPath,
            startTime,
            endTime,
            cutMode = 'keep_selection',
            totalDuration,
            magicMaster = false,
            auditionMaster = false,
            voiceLeveler = false,
            studioTone = 'none',
            noiseGate = false,
            pitchShift = 0,
            speed = 1.0,
            volume = 1.0,
            normalize = false,
            limiterEnabled = false,
            limiterCeiling = -1.0,
            compressorRatio = 3.5,
            compressorThreshold = -18,
            bass = 0,
            mid = 0,
            treble = 0,
            denoise = 'none',
            fadeIn = 0,
            fadeOut = 0,
            reverb = false,
            format = 'mp3',
            bitrate = '192k'
        } = options;

        if (!inputPath || !fs.existsSync(inputPath)) {
            throw new Error('Input audio file does not exist');
        }

        ensureDir(config.outputsDir);

        const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e4);
        const ext = format === 'wav' ? 'wav' : 'mp3';
        const outputFilename = `edited-${uniqueId}.${ext}`;
        const outputPath = path.join(config.outputsDir, outputFilename);

        const args = ['-y'];

        // 1. Handling trimming & cutting
        const hasTimeRange = startTime !== undefined && endTime !== undefined && endTime > startTime;

        if (hasTimeRange && cutMode === 'keep_selection') {
            args.push('-ss', startTime.toString(), '-to', endTime.toString());
            args.push('-i', inputPath);
        } else {
            args.push('-i', inputPath);
        }

        // Build Audio Filtergraph
        const filters = [];

        // Cut mode: Remove selection
        if (hasTimeRange && cutMode === 'remove_selection' && totalDuration && totalDuration > endTime) {
            filters.push(`aselect='not(between(t,${startTime},${endTime}))',asetpts=N/SR/TB`);
        }

        const isFullAuditionMaster = auditionMaster || magicMaster;

        // ─────────────────────────────────────────────────────────────
        // STEP 1 & 2: NOISE REDUCTION & HIGH-PASS RUMBLE CUT (Adobe Audition Style)
        // ─────────────────────────────────────────────────────────────
        if (isFullAuditionMaster || denoise !== 'none' || noiseGate) {
            // Cut low-frequency rumble & plosives below 80Hz
            filters.push('highpass=f=80');
        }

        if (isFullAuditionMaster || denoise === 'audition_clean' || denoise === 'studio') {
            // Spectral FFT Adaptive Denoise with gentle lowpass to remove air hiss
            filters.push('afftdn=nr=18:nf=-28:tn=1');
        } else if (denoise === 'medium') {
            filters.push('afftdn=nf=-26');
        } else if (denoise === 'low') {
            filters.push('lowpass=f=12500');
        } else if (denoise === 'high') {
            filters.push('afftdn=nr=24:nf=-34:tn=1,lowpass=f=9500');
        }

        // Adaptive Noise Gate (Silence pauses cleanup)
        if (isFullAuditionMaster || noiseGate) {
            filters.push('agate=threshold=-32dB:ratio=2.5:attack=10:release=160:range=-24dB');
        }

        // ─────────────────────────────────────────────────────────────
        // PITCH & SPEED DSP
        // ─────────────────────────────────────────────────────────────
        const sampleRate = 44100;
        const pShift = Number(pitchShift) || 0;
        const spd = Math.max(0.25, Math.min(4.0, Number(speed) || 1.0));

        if (pShift !== 0) {
            const pitchMultiplier = Math.pow(2, pShift / 12);
            const targetSampleRate = Math.round(sampleRate * pitchMultiplier);
            const tempoCompensation = spd / pitchMultiplier;

            filters.push(`asetrate=${targetSampleRate}`);
            
            const atempoFilters = this.buildAtempoFilter(tempoCompensation);
            if (atempoFilters) filters.push(atempoFilters);
            filters.push(`aresample=${sampleRate}`);
        } else if (spd !== 1.0) {
            const atempoFilters = this.buildAtempoFilter(spd);
            if (atempoFilters) filters.push(atempoFilters);
        }

        // ─────────────────────────────────────────────────────────────
        // STEP 3: PARAMETRIC EQUALIZATION (EQ) (Adobe Audition Style)
        // ─────────────────────────────────────────────────────────────
        if (isFullAuditionMaster || studioTone === 'audition_vocal' || studioTone === 'magic_studio') {
            // Adobe Audition Vocal Mastering EQ:
            // 1. De-mud boxiness at 280-320Hz (-3dB)
            // 2. Vocal intelligibility & presence boost at 3.6kHz (+3.5dB)
            // 3. Silky air sheen at 11.5kHz (+2.0dB)
            filters.push('equalizer=f=300:width_type=o:width=1.2:g=-3.0');
            filters.push('equalizer=f=3600:width_type=o:width=1.2:g=3.5');
            filters.push('equalizer=f=11500:width_type=o:width=1.5:g=2.2');
        } else if (studioTone === 'podcast_warm') {
            // Warm Intimate Podcast: Body 140Hz, Mid de-mud 350Hz, Presence 4kHz
            filters.push('equalizer=f=140:width_type=o:width=1.2:g=3.0');
            filters.push('equalizer=f=350:width_type=o:width=1.2:g=-2.0');
            filters.push('equalizer=f=4000:width_type=o:width=1.2:g=2.5');
        } else if (studioTone === 'recap_punchy') {
            // Movie Recap Punchy Tone: Cinema Bass 100Hz, De-mud 400Hz, Punchy Presence 3.2kHz
            filters.push('equalizer=f=100:width_type=o:width=1.0:g=3.5');
            filters.push('equalizer=f=400:width_type=o:width=1.2:g=-2.5');
            filters.push('equalizer=f=3200:width_type=o:width=1.2:g=3.8');
        } else if (studioTone === 'crisp_clear') {
            // Crystal Clear Intelligibility: De-mud 250Hz, Clarity 3.8kHz, Air 12kHz
            filters.push('equalizer=f=250:width_type=o:width=1.2:g=-3.0');
            filters.push('equalizer=f=3800:width_type=o:width=1.2:g=4.2');
            filters.push('equalizer=f=12000:width_type=o:width=1.5:g=2.8');
        }

        // Custom 3-Band Equalizer Sliders
        if (Number(bass) !== 0) {
            filters.push(`equalizer=f=120:width_type=o:width=1.5:g=${bass}`);
        }
        if (Number(mid) !== 0) {
            filters.push(`equalizer=f=1500:width_type=o:width=1.5:g=${mid}`);
        }
        if (Number(treble) !== 0) {
            filters.push(`equalizer=f=8000:width_type=o:width=1.5:g=${treble}`);
        }

        // ─────────────────────────────────────────────────────────────
        // STEP 4: DYNAMIC COMPRESSION (Vocal Leveler & Consistency)
        // ─────────────────────────────────────────────────────────────
        const compRatio = Number(compressorRatio) || 3.5;
        const compThresh = Number(compressorThreshold) || -18;

        if (isFullAuditionMaster || voiceLeveler) {
            // Studio Dynamic Range Compressor: Smooths loudness spikes & lifts quiet words
            filters.push(`acompressor=threshold=${compThresh}dB:ratio=${compRatio}:attack=12:release=180:makeup=2.5dB`);
        }

        // ─────────────────────────────────────────────────────────────
        // STEP 5: PEAK LIMITER & LOUDNESS NORMALIZATION (Distortion Guard)
        // ─────────────────────────────────────────────────────────────
        const ceiling = Math.min(-0.2, Number(limiterCeiling) || -1.0);

        if (isFullAuditionMaster || limiterEnabled) {
            // Hard Lookahead Peak Limiter to prevent clipping in final video export
            filters.push(`alimiter=limit=${ceiling}dB:attack=5:release=50:asc=1`);
            // EBU R128 Broadcast Loudness Normalization (-16 LUFS for YouTube / Social Video)
            filters.push(`loudnorm=I=-16:TP=${ceiling}:LRA=10`);
        } else if (normalize) {
            // Standard Dynamic Normalization
            filters.push('dynaudnorm=f=150:g=15:m=10:p=0.95');
        }

        // Studio Reverb Ambience
        if (reverb) {
            filters.push('aecho=0.8:0.7:35:0.25');
        }

        // Volume Gain adjustment
        if (Number(volume) !== 1.0 && Number(volume) > 0) {
            filters.push(`volume=${volume}`);
        }

        // Fade In / Fade Out
        if (Number(fadeIn) > 0) {
            filters.push(`afade=t=in:ss=0:d=${fadeIn}`);
        }
        if (Number(fadeOut) > 0 && totalDuration && totalDuration > fadeOut) {
            const effectiveDuration = hasTimeRange && cutMode === 'keep_selection' ? (endTime - startTime) : totalDuration;
            const fadeStart = Math.max(0, effectiveDuration - fadeOut);
            filters.push(`afade=t=out:st=${fadeStart}:d=${fadeOut}`);
        }

        if (filters.length > 0) {
            args.push('-af', filters.join(','));
        }

        // Output formatting
        if (format === 'wav') {
            args.push('-c:a', 'pcm_s16le');
        } else {
            args.push('-c:a', 'libmp3lame', '-b:a', bitrate || '192k');
        }

        args.push(outputPath);

        return new Promise((resolve, reject) => {
            execFile(ffmpeg, args, { windowsHide: true }, (err, stdout, stderr) => {
                if (err || !fs.existsSync(outputPath)) {
                    return reject(new Error(stderr || err?.message || 'Audio editing process failed.'));
                }

                EditorService.getAudioDuration(outputPath)
                    .then((duration) => {
                        resolve({
                            success: true,
                            filename: outputFilename,
                            audioUrl: `/storage/outputs/${outputFilename}`,
                            duration
                        });
                    })
                    .catch(() => {
                        resolve({
                            success: true,
                            filename: outputFilename,
                            audioUrl: `/storage/outputs/${outputFilename}`,
                            duration: 0
                        });
                    });
            });
        });
    }

    /**
     * Build chain of atempo filters
     * @param {number} factor
     * @returns {string}
     */
    static buildAtempoFilter(factor) {
        if (Math.abs(factor - 1.0) < 0.01) return '';
        const list = [];
        let val = factor;

        while (val < 0.5) {
            list.push('atempo=0.5');
            val /= 0.5;
        }
        while (val > 2.0) {
            list.push('atempo=2.0');
            val /= 2.0;
        }
        if (Math.abs(val - 1.0) >= 0.01) {
            list.push(`atempo=${val.toFixed(4)}`);
        }

        return list.join(',');
    }

    /**
     * Get audio duration using FFmpeg
     * @param {string} filePath
     * @returns {Promise<number>}
     */
    static getAudioDuration(filePath) {
        return new Promise((resolve) => {
            const args = ['-i', filePath];
            execFile(ffmpeg, args, { windowsHide: true }, (err, stdout, stderr) => {
                const match = (stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
                if (match) {
                    const hours = parseFloat(match[1]);
                    const mins = parseFloat(match[2]);
                    const secs = parseFloat(match[3]);
                    const totalSecs = hours * 3600 + mins * 60 + secs;
                    return resolve(parseFloat(totalSecs.toFixed(2)));
                }
                resolve(0);
            });
        });
    }
}

module.exports = EditorService;
