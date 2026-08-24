const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    
    // File upload settings
    uploadsDir: path.join(__dirname, '../../storage/uploads'),
    outputsDir: path.join(__dirname, '../../storage/outputs'),
    maxFileSize: 25 * 1024 * 1024, // 25MB
    allowedAudioMimeTypes: [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
        'audio/x-m4a',
        'audio/m4a'
    ],

    // Storage cleanup settings (Cron / Scheduler)
    cleanup: {
        enabled: process.env.CLEANUP_ENABLED !== 'false',
        intervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60', 10),
        maxAgeHours: parseInt(process.env.CLEANUP_MAX_AGE_HOURS || '24', 10)
    },

    // Available Edge TTS Voices
    voices: {
        km: [
            { id: 'km-KH-PisethNeural', name: 'Piseth (Male)', gender: 'Male', lang: 'km' },
            { id: 'km-KH-SreymomNeural', name: 'Sreymom (Female)', gender: 'Female', lang: 'km' }
        ],
        en: [
            { id: 'en-US-JennyNeural', name: 'Jenny (Female - Warm)', gender: 'Female', lang: 'en' },
            { id: 'en-US-GuyNeural', name: 'Guy (Male - Clear)', gender: 'Male', lang: 'en' },
            { id: 'en-US-AriaNeural', name: 'Aria (Female - Expressive)', gender: 'Female', lang: 'en' },
            { id: 'en-US-ChristopherNeural', name: 'Christopher (Male - Calm)', gender: 'Male', lang: 'en' }
        ]
    }
};

module.exports = config;
