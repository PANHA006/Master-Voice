const { execFile } = require('child_process');
const fs = require('fs');

const VOICE_PRESETS = {
    // 🇰🇭 Khmer Voices (Distinct Acoustic Pitch & Formant Transforms)
    'km-KH-PisethNeural': {
        // Khmer Piseth: Deep, clear, masculine male voice
        filter: 'asetrate=18000,atempo=1.3333333333333333,equalizer=f=120:width_type=o:width=1.2:g=6,equalizer=f=2800:width_type=o:width=1.0:g=2,volume=1.3'
    },
    'km-pros': {
        // Khmer Veasna: Deep, commanding, authoritative baritone male voice
        filter: 'asetrate=16800,atempo=1.4285714285714286,equalizer=f=100:width_type=o:width=1.2:g=7,equalizer=f=3000:width_type=o:width=1.0:g=2,volume=1.35'
    },
    'km-KH-SreymomNeural': {
        // Khmer Sreymom: Soft, sweet, melodic feminine voice
        filter: 'asetrate=27600,atempo=0.8695652173913043,equalizer=f=3500:width_type=o:width=1.2:g=4.5,volume=1.2'
    },
    'km-srey': {
        // Khmer Sophea: Bright, high-pitch feminine voice
        filter: 'asetrate=28800,atempo=0.8333333333333334,equalizer=f=3200:width_type=o:width=1.2:g=5.0,volume=1.2'
    },
    'km-news': {
        // Khmer Broadcaster: Articulate television news presenter
        filter: 'asetrate=20400,atempo=1.1764705882352942,equalizer=f=2500:width_type=o:width=1.0:g=4,compand=0.01|0.04:6:-60/-60|-20/-16|0/-2:6:0:-90:0.05,volume=1.3'
    },
    'km-story': {
        // Khmer Storyteller: Warm, narrative baritone podcast resonance
        filter: 'asetrate=19200,atempo=1.25,equalizer=f=140:width_type=o:width=1.2:g=4,aecho=0.8:0.88:30:0.15,volume=1.25'
    },
    'km-default': {
        filter: null
    },

    // 🇺🇸 / 🇬🇧 English Voices
    'en-us-male': {
        filter: 'asetrate=18000,atempo=1.3333333333333333,equalizer=f=120:width_type=o:width=1.2:g=5,volume=1.25'
    },
    'en-us-female': {
        filter: 'asetrate=27600,atempo=0.8695652173913043,equalizer=f=3200:width_type=o:width=1.2:g=4,volume=1.15'
    },
    'en-uk-male': {
        filter: 'asetrate=18240,atempo=1.3157894736842106,equalizer=f=140:width_type=o:width=1.0:g=4,volume=1.2'
    },
    'en-uk': {
        filter: 'asetrate=26400,atempo=0.9090909090909091,equalizer=f=3000:width_type=o:width=1.0:g=3,volume=1.15'
    },
    'en-default': {
        filter: null
    }
};

/**
 * Apply acoustic voice profile to audio file using ffmpeg
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {string} voiceId
 */
function applyVoiceProfile(inputPath, outputPath, voiceId) {
    return new Promise((resolve) => {
        // Native Neural voices (Edge TTS / Azure / Cloned) must stay 100% pure without altering sample rate / Hz
        if (voiceId && (voiceId.includes('Neural') || voiceId.startsWith('cloned-'))) {
            if (inputPath !== outputPath) {
                fs.copyFileSync(inputPath, outputPath);
            }
            return resolve(outputPath);
        }

        const preset = VOICE_PRESETS[voiceId];
        if (!preset || !preset.filter) {
            if (inputPath !== outputPath) {
                fs.copyFileSync(inputPath, outputPath);
            }
            return resolve(outputPath);
        }

        const args = ['-y', '-i', inputPath, '-af', preset.filter, outputPath];
        execFile('ffmpeg', args, (err) => {
            if (err) {
                console.error(`Voice filter error for ${voiceId}:`, err.message);
                if (inputPath !== outputPath) {
                    fs.copyFileSync(inputPath, outputPath);
                }
                return resolve(outputPath);
            }
            resolve(outputPath);
        });
    });
}

module.exports = {
    VOICE_PRESETS,
    applyVoiceProfile
};
