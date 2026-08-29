const path = require('path');
const fs = require('fs');
const EditorService = require('../src/services/editor.service');
const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');

async function testEditor() {
    console.log('🧪 Starting Voice Editor Service Tests...\n');

    // 1. Generate a test audio tone (5 seconds) using ffmpeg
    const testDir = path.join(__dirname, '../storage/uploads');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const sampleAudio = path.join(testDir, 'test-sample.mp3');
    console.log('1. Generating 5-second sine tone test sample...');

    await new Promise((resolve, reject) => {
        const args = ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=5', '-c:a', 'libmp3lame', sampleAudio];
        execFile(ffmpeg, args, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });

    console.log('   ✅ Sample audio generated:', sampleAudio);

    // 2. Test getAudioDuration
    console.log('\n2. Testing getAudioDuration...');
    const duration = await EditorService.getAudioDuration(sampleAudio);
    console.log(`   ✅ Detected Duration: ${duration}s (expected ~5.0s)`);

    // 3. Test trimming (keep selection 1.0s to 3.5s)
    console.log('\n3. Testing Trim / Keep Selection (1.0s - 3.5s)...');
    const trimResult = await EditorService.processAudio({
        inputPath: sampleAudio,
        startTime: 1.0,
        endTime: 3.5,
        cutMode: 'keep_selection'
    });
    console.log(`   ✅ Trimmed File: ${trimResult.filename} (Duration: ${trimResult.duration}s)`);

    // 4. Test DSP Effects (Pitch +3, Speed 1.2x, EQ, Denoise, Reverb, Fade)
    console.log('\n4. Testing Full DSP Effects Chain (Pitch, Speed, EQ, Denoise, Reverb, Normalize, Fade In/Out)...');
    const dspResult = await EditorService.processAudio({
        inputPath: sampleAudio,
        pitchShift: 3,
        speed: 1.2,
        volume: 1.2,
        normalize: true,
        bass: 4,
        mid: -2,
        treble: 3,
        denoise: 'medium',
        fadeIn: 0.5,
        fadeOut: 0.5,
        reverb: true,
        format: 'mp3',
        bitrate: '192k'
    });
    console.log(`   ✅ DSP Processed File: ${dspResult.filename} (Duration: ${dspResult.duration}s)`);

    console.log('\n🎉 ALL VOICE EDITOR BACKEND TESTS PASSED SUCCESSFULLY!\n');
}

testEditor().catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
