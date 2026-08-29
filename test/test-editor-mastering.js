/**
 * Test Adobe Audition 5-Step Mastering Pipeline in Voice Editor
 */
const path = require('path');
const fs = require('fs');
const EditorService = require('../src/services/editor.service');
const TTSService = require('../src/services/tts.service');

async function runTest() {
    console.log('===============================================================');
    console.log('🧪 TESTING ADOBE AUDITION 5-STEP STUDIO MASTERING PIPELINE');
    console.log('===============================================================');

    // 1. Generate a test audio file using TTS
    console.log('1️⃣ Generating test audio sample with Khmer TTS...');
    const ttsResult = await TTSService.synthesize({
        text: 'នេះគឺជាការធ្វើតេស្តសាកល្បងមុខងារ 5-Step Adobe Audition Studio Mastering នៅក្នុង Voice Editor។ សំឡេងនឹងត្រូវបានសម្អាត Noise, កែតម្រូវ Parametric EQ, ដាក់ Dynamic Compressor និង Peak Limiter យ៉ាងស្អាត។',
        voice: 'km-KH-PisethNeural',
        lang: 'km'
    });

    const testAudioPath = path.join(__dirname, '../storage/outputs', ttsResult.fileName);
    console.log(`   Sample generated: ${testAudioPath} (Duration: ${ttsResult.duration}s)`);

    // 2. Test 5-Step Adobe Audition Master Execution
    console.log('\n2️⃣ Processing with 5-Step Adobe Audition Master Chain...');
    console.log('   Step 1: Input Setup & 44.1kHz Hi-Fi extraction');
    console.log('   Step 2: Spectral Denoise (afftdn) + Rumble Cut (highpass 80Hz) + Silence Gate (agate)');
    console.log('   Step 3: Parametric EQ (De-mud 300Hz -3dB, Presence 3.6kHz +3.5dB, Air 11.5kHz +2.2dB)');
    console.log('   Step 4: Studio Dynamic Compressor (3.5:1 ratio, -18dB threshold, +2.5dB makeup)');
    console.log('   Step 5: Hard True Peak Limiter (Ceiling -1.0dB) + EBU R128 (-16 LUFS)');

    const startTime = Date.now();
    const masteredResult = await EditorService.processAudio({
        inputPath: testAudioPath,
        auditionMaster: true,
        studioTone: 'audition_vocal',
        denoise: 'audition_clean',
        noiseGate: true,
        voiceLeveler: true,
        compressorRatio: 3.5,
        compressorThreshold: -18,
        limiterEnabled: true,
        limiterCeiling: -1.0,
        format: 'mp3',
        bitrate: '192k'
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Mastering Completed in ${elapsed}s!`);
    console.log(`   Output Filename: ${masteredResult.filename}`);
    console.log(`   Output URL: ${masteredResult.audioUrl}`);
    console.log(`   Output Duration: ${masteredResult.duration}s`);

    const finalPath = path.join(__dirname, '../storage/outputs', masteredResult.filename);
    if (!fs.existsSync(finalPath) || fs.statSync(finalPath).size === 0) {
        throw new Error('Mastered output file is missing or 0 bytes!');
    }

    console.log(`   Output File Size: ${(fs.statSync(finalPath).size / 1024).toFixed(1)} KB`);

    // 3. Test Manual EQ & Custom Limiter adjustments
    console.log('\n3️⃣ Testing Custom 3-Band Parametric EQ & Custom Limiter (-0.5dB)...');
    const customResult = await EditorService.processAudio({
        inputPath: testAudioPath,
        studioTone: 'none',
        bass: 3,
        mid: 2,
        treble: 4,
        voiceLeveler: true,
        compressorRatio: 4.0,
        compressorThreshold: -16,
        limiterEnabled: true,
        limiterCeiling: -0.5,
        denoise: 'medium',
        format: 'mp3',
        bitrate: '192k'
    });

    console.log(`✅ Custom EQ & Limiter Processing Passed! Output: ${customResult.filename}`);

    console.log('\n===============================================================');
    console.log('🎉 ALL ADOBE AUDITION MASTERING TESTS PASSED PERFECTLY!');
    console.log('===============================================================');
}

runTest().catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
