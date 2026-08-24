const path = require('path');
const fs = require('fs');
const AcousticAnalyzer = require('../src/utils/acoustic-analyzer.util');
const CloneService = require('../src/services/clone.service');
const VoiceManager = require('../src/utils/voice-manager.util');
const googleTTS = require('google-tts-api');

async function runAcousticCloneTests() {
    console.log('=== 🔬 RUNNING ACOUSTIC FREQUENCY (Hz) CLONING TESTS ===\n');

    // 1. Prepare reference audio sample
    const testDir = path.join(__dirname, '../storage/uploads/cloned-samples');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    let testSamplePath = path.join(testDir, 'test-sample.mp3');

    if (!fs.existsSync(testSamplePath)) {
        console.log('[*] Generating test reference audio sample with Khmer TTS...');
        const base64Audio = await googleTTS.getAudioBase64('សួស្តីបាទ នេះជាសំឡេងគំរូសម្រាប់ធ្វើតេស្តប្រព័ន្ធ AI', {
            lang: 'km',
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000
        });
        fs.writeFileSync(testSamplePath, Buffer.from(base64Audio, 'base64'));
    }

    console.log(`[1] Audio Reference Sample: ${testSamplePath}`);

    // 2. Test Phase 1: Acoustic Frequency & Pitch (Hz) Analysis
    console.log('\n[2] Testing AcousticAnalyzer.analyzeVoice()...');
    const acousticData = await AcousticAnalyzer.analyzeVoice(testSamplePath, 'km');
    console.log(`   - Detected Pitch (F0): ${acousticData.detectedHz} Hz (Min: ${acousticData.minHz} Hz, Max: ${acousticData.maxHz} Hz)`);
    console.log(`   - Voice Category: ${acousticData.voiceCategory}`);
    console.log(`   - Base Neural Voice: ${acousticData.baseNeuralVoice} (Standard: ${acousticData.baseStandardHz} Hz)`);
    console.log(`   - Delta Pitch Offset: ${acousticData.pitchOffsetStr}`);
    console.log(`   - DSP Filtergraph: ${acousticData.dspFiltergraph}`);

    if (!acousticData.detectedHz || acousticData.detectedHz <= 0) {
        throw new Error('Acoustic pitch analysis failed to detect valid Hz');
    }
    console.log('   ✅ Phase 1 Acoustic Analysis passed!');

    // 3. Test Phase 2: Synthesis & Acoustic Morphing
    console.log('\n[3] Testing CloneService.cloneAndSynthesize()...');
    const synthResult = await CloneService.cloneAndSynthesize({
        referenceAudioPath: testSamplePath,
        text: 'សួស្តី! នេះគឺជាសំឡេងដែលត្រូវបានវិភាគកម្រិត Hz និងកែតម្រូវប្រេកង់រួចរាល់។\nសំឡេងនេះមានភាពស៊ីគ្នានឹងសំឡេងគំរូដើមរបស់អ្នក។',
        voiceName: 'Test Cloned Voice',
        lang: 'km',
        saveToRegistry: false
    });

    console.log(`   - Audio URL: ${synthResult.audioUrl}`);
    console.log(`   - Duration: ${synthResult.duration}s`);
    console.log(`   - Timestamps count: ${synthResult.timestamps.length}`);
    synthResult.timestamps.forEach(t => console.log(`     ${t.formattedLine}`));

    if (!synthResult.success || !synthResult.audioDataUri || synthResult.timestamps.length === 0) {
        throw new Error('Synthesis and Morphing failed');
    }
    console.log('   ✅ Phase 2 Synthesis & Morphing passed!');

    // 4. Test Phase 3: Save Voice Profile
    console.log('\n[4] Testing CloneService.saveVoiceProfile()...');
    const saveResult = CloneService.saveVoiceProfile({
        voiceName: 'Test Khmer Cloned Voice',
        lang: 'km',
        referenceAudioPath: testSamplePath,
        acousticData
    });
    console.log(`   - Saved Voice ID: ${saveResult.voiceId}`);
    console.log(`   - Message: ${saveResult.message}`);

    const allVoices = VoiceManager.getAllVoices();
    const found = allVoices.km.find(v => v.id === saveResult.voiceId);
    if (!found) {
        throw new Error('Saved voice not found in VoiceManager');
    }
    console.log(`   - Verified in VoiceManager: ${found.name}`);
    console.log('   ✅ Phase 3 Save Voice Profile passed!');

    // Clean up test voice from registry
    VoiceManager.deleteClonedVoice(saveResult.voiceId);

    console.log('\n======================================================');
    console.log('🎉 ALL ACOUSTIC CLONING TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================');
}

runAcousticCloneTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
