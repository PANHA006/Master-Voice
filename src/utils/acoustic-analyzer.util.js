const { spawn } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');

class AcousticAnalyzer {
    /**
     * Extract 16kHz Mono 16-bit PCM buffer from any audio file using ffmpeg
     * @param {string} audioPath 
     * @returns {Promise<Int16Array>}
     */
    static async extractPcmData(audioPath) {
        return new Promise((resolve, reject) => {
            const ffmpegProcess = spawn(ffmpegStatic, [
                '-i', audioPath,
                '-f', 's16le',
                '-acodec', 'pcm_s16le',
                '-ac', '1',
                '-ar', '16000',
                '-'
            ], { windowsHide: true });

            const chunks = [];
            ffmpegProcess.stdout.on('data', (chunk) => chunks.push(chunk));
            ffmpegProcess.stderr.on('data', () => {}); // silence stderr

            ffmpegProcess.on('close', (code) => {
                if (code !== 0) {
                    return reject(new Error(`FFmpeg exited with code ${code}`));
                }
                const buffer = Buffer.concat(chunks);
                const sampleCount = Math.floor(buffer.length / 2);
                const pcm16 = new Int16Array(sampleCount);
                for (let i = 0; i < sampleCount; i++) {
                    pcm16[i] = buffer.readInt16LE(i * 2);
                }
                resolve(pcm16);
            });

            ffmpegProcess.on('error', (err) => reject(err));
        });
    }

    /**
     * Estimate Fundamental Frequency (F0 / Pitch in Hz) using YIN / Autocorrelation
     * @param {Int16Array} samples - 16kHz mono audio samples
     * @returns {Object} { meanHz, minHz, maxHz, voicedFraction }
     */
    static detectPitch(samples, sampleRate = 16000) {
        if (!samples || samples.length === 0) {
            return { meanHz: 130, minHz: 100, maxHz: 180, voicedFraction: 0 };
        }

        const frameSize = 1024; // ~64ms window
        const hopSize = 512;    // ~32ms step
        const minPitchHz = 65;  // Low male bass (~C2)
        const maxPitchHz = 400; // High female soprano (~G4)

        const maxLag = Math.floor(sampleRate / minPitchHz); // ~246 samples
        const minLag = Math.floor(sampleRate / maxPitchHz); // ~40 samples

        const detectedPitches = [];

        for (let offset = 0; offset + frameSize < samples.length; offset += hopSize) {
            // Calculate frame energy to check if voiced
            let frameEnergy = 0;
            for (let i = 0; i < frameSize; i++) {
                const s = samples[offset + i];
                frameEnergy += s * s;
            }
            const rms = Math.sqrt(frameEnergy / frameSize);
            if (rms < 300) {
                // Silenced or unvoiced frame
                continue;
            }

            // Difference function (YIN simplified)
            let bestLag = -1;
            let minDiff = Infinity;

            for (let lag = minLag; lag <= maxLag; lag++) {
                let diff = 0;
                for (let i = 0; i < frameSize - lag; i++) {
                    const delta = samples[offset + i] - samples[offset + i + lag];
                    diff += delta * delta;
                }
                // Normalize by lag
                const normDiff = diff / (frameSize - lag);
                if (normDiff < minDiff) {
                    minDiff = normDiff;
                    bestLag = lag;
                }
            }

            if (bestLag > 0) {
                const freq = sampleRate / bestLag;
                if (freq >= minPitchHz && freq <= maxPitchHz) {
                    detectedPitches.push(freq);
                }
            }
        }

        if (detectedPitches.length === 0) {
            return { meanHz: 140, minHz: 120, maxHz: 160, voicedFraction: 0 };
        }

        // Sort to get median and remove outliers
        detectedPitches.sort((a, b) => a - b);
        const q1 = detectedPitches[Math.floor(detectedPitches.length * 0.25)];
        const q3 = detectedPitches[Math.floor(detectedPitches.length * 0.75)];
        const filtered = detectedPitches.filter(p => p >= q1 * 0.8 && p <= q3 * 1.2);
        const activeList = filtered.length > 0 ? filtered : detectedPitches;

        const sum = activeList.reduce((acc, v) => acc + v, 0);
        const meanHz = Math.round(sum / activeList.length);
        const minHz = Math.round(activeList[0]);
        const maxHz = Math.round(activeList[activeList.length - 1]);

        return {
            meanHz,
            minHz,
            maxHz,
            voicedFraction: Math.round((activeList.length / (samples.length / hopSize)) * 100) / 100
        };
    }

    /**
     * Analyze spectral balance into frequency bands (Bass, Mid, High/Air)
     * @param {Int16Array} samples 
     * @returns {Object} Energy distribution in dB/relative weights
     */
    static analyzeFrequencyBands(samples) {
        if (!samples || samples.length === 0) {
            return { subBass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0 };
        }

        let zeroCrossings = 0;
        for (let i = 1; i < samples.length; i++) {
            if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
                zeroCrossings++;
            }
        }

        const zcr = zeroCrossings / samples.length; // high ZCR = more high frequencies
        
        return {
            subBassDb: zcr < 0.08 ? 3 : -1,
            bodyDb: zcr < 0.12 ? 2 : 0,
            presenceDb: zcr > 0.15 ? 3 : 0,
            airDb: zcr > 0.20 ? 4 : 1,
            zcr: Math.round(zcr * 1000) / 1000
        };
    }

    /**
     * Perform complete acoustic analysis of an audio file
     * @param {string} audioPath 
     * @param {string} lang ('km' or 'en')
     */
    static async analyzeVoice(audioPath, lang = 'km') {
        const pcmData = await this.extractPcmData(audioPath);
        const pitchInfo = this.detectPitch(pcmData, 16000);
        const spectralInfo = this.analyzeFrequencyBands(pcmData);

        const meanHz = pitchInfo.meanHz;

        // Determine Voice Classification
        let voiceCategory = 'Baritone (បុរស - សំឡេងមធ្យម)';
        let baseNeuralVoice = (lang === 'km') ? 'km-KH-PisethNeural' : 'en-US-GuyNeural';
        let baseStandardHz = (lang === 'km') ? 120 : 115; // Standard Male Base

        if (meanHz < 110) {
            voiceCategory = 'Bass (បុរស - សំឡេងគ្រលរខ្លាំង)';
            baseNeuralVoice = (lang === 'km') ? 'km-KH-PisethNeural' : 'en-US-GuyNeural';
            baseStandardHz = (lang === 'km') ? 120 : 115;
        } else if (meanHz >= 110 && meanHz < 155) {
            voiceCategory = 'Baritone / Tenor (បុរស - សំឡេងធម្មជាតិ)';
            baseNeuralVoice = (lang === 'km') ? 'km-KH-PisethNeural' : 'en-US-GuyNeural';
            baseStandardHz = (lang === 'km') ? 120 : 115;
        } else if (meanHz >= 155 && meanHz < 205) {
            voiceCategory = 'Alto (ស្ត្រី - សំឡេងធ្ងន់/គ្រលរ ឬយុវវ័យ)';
            baseNeuralVoice = (lang === 'km') ? 'km-KH-SreymomNeural' : 'en-US-JennyNeural';
            baseStandardHz = (lang === 'km') ? 210 : 205;
        } else {
            voiceCategory = 'Soprano (ស្ត្រី - សំឡេងស្រួយ/ខ្ពស់)';
            baseNeuralVoice = (lang === 'km') ? 'km-KH-SreymomNeural' : 'en-US-JennyNeural';
            baseStandardHz = (lang === 'km') ? 215 : 210;
        }

        // Calculate Delta Hz and Pitch Offset for Edge-TTS & FFmpeg
        const deltaPitchHz = meanHz - baseStandardHz;
        const pitchOffsetStr = deltaPitchHz >= 0 ? `+${deltaPitchHz}Hz` : `${deltaPitchHz}Hz`;

        // Generate tailored FFmpeg Parametric Equalizer and Formant Filtergraph
        const eqFilters = [];
        if (meanHz < 130) {
            // Warm Bass boost, slight presence cut for deep male timbre
            eqFilters.push('equalizer=f=120:width_type=h:width=80:g=4.5');
            eqFilters.push('equalizer=f=300:width_type=h:width=150:g=2.0');
            eqFilters.push('equalizer=f=3000:width_type=h:width=600:g=-1.5');
        } else if (meanHz > 190) {
            // High clarity boost for bright female voice
            eqFilters.push('equalizer=f=160:width_type=h:width=100:g=-2.5');
            eqFilters.push('equalizer=f=2800:width_type=h:width=500:g=3.5');
            eqFilters.push('equalizer=f=6000:width_type=h:width=1000:g=2.0');
        } else {
            // Neutral balanced enhancement
            eqFilters.push('equalizer=f=200:width_type=h:width=100:g=1.5');
            eqFilters.push('equalizer=f=2500:width_type=h:width=500:g=1.5');
        }

        // Add soft dynamic compander for vocal warmth and consistency
        eqFilters.push('compand=0.3|0.8:6:-70/-60|-20/-10|0/0:6:0:-90:0.2');

        const dspFiltergraph = eqFilters.join(',');

        return {
            detectedHz: meanHz,
            minHz: pitchInfo.minHz,
            maxHz: pitchInfo.maxHz,
            voiceCategory,
            baseNeuralVoice,
            baseStandardHz,
            deltaPitchHz,
            pitchOffsetStr,
            dspFiltergraph,
            spectral: spectralInfo
        };
    }
}

module.exports = AcousticAnalyzer;
