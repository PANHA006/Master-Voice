const path = require('path');
const fs = require('fs');
const CloneService = require('../src/services/clone.service');

async function runLocalVoiceCloneTest() {
    console.log('====================================================');
    console.log(' Testing Local XTTS-v2 Voice Cloning via Node.js');
    console.log('====================================================');

    // Check if test audio exists, otherwise use test-khmer.mp3
    const samplePath = path.resolve(__dirname, '../test-khmer.mp3');
    if (!fs.existsSync(samplePath)) {
        console.error('[-] Reference audio sample not found at:', samplePath);
        return;
    }

    const testText = "Hello! This is an automated test for local XTTS-v2 voice cloning running directly inside Node.js.";

    try {
        console.log('[*] Invoking CloneService.cloneAndSynthesize()...');
        const result = await CloneService.cloneAndSynthesize({
            referenceAudioPath: samplePath,
            text: testText,
            voiceName: 'Test Cloned Voice',
            lang: 'en'
        });

        console.log('\n[+] Voice Cloning Finished Successfully:');
        console.log(' - Voice Name:', result.voiceName);
        console.log(' - Output File:', result.fileName);
        console.log(' - Audio URL:', result.audioUrl);
        console.log(' - Total Duration:', result.duration, 'seconds');
        console.log(' - Timestamps Count:', result.timestamps.length);
    } catch (err) {
        console.error('[-] Error during voice clone test:', err.message);
    }
}

runLocalVoiceCloneTest();
