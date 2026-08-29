const multer = require('multer');
const path = require('path');
const config = require('../config/config');
const { ensureDir } = require('../utils/audio.util');

ensureDir(config.uploadsDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDir(config.uploadsDir);
        cb(null, config.uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `audio-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/') || config.allowedAudioMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only audio and video files (.mp4, .mov, .mkv, .webm, .avi, .mp3, .wav, .m4a, .ogg) are allowed!'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: config.maxFileSize
    },
    fileFilter
});

module.exports = upload;
