const fs = require('fs');
const path = require('path');
const { convertToMp3 } = require('../src/utils/audio.util');
const config = require('../src/config/config');

async function convertAllWebmInStorage() {
    const folders = [config.uploadsDir, config.outputsDir];

    for (const dir of folders) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.toLowerCase().endsWith('.webm')) {
                const fullPath = path.join(dir, file);
                console.log(`Converting ${file} -> MP3...`);
                try {
                    const res = await convertToMp3(fullPath);
                    console.log(`✅ Converted to: ${res.filename}`);
                } catch (e) {
                    console.error(`Failed to convert ${file}:`, e.message);
                }
            }
        }
    }
}

convertAllWebmInStorage().then(() => {
    console.log('🎉 All existing webm files converted to mp3.');
});
