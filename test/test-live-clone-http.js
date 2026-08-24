const path = require('path');
const fs = require('fs');
const http = require('http');
const app = require('../src/app');
const googleTTS = require('google-tts-api');

async function runLiveHttpTests() {
    console.log('================================================================');
    console.log('🧪 LIVE HTTP API END-TO-END VERIFICATION & TESTING');
    console.log('================================================================\n');

    // 1. Spin up ephemeral server on free port
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[+] Temporary test server running on ${baseUrl}`);

    // 2. Prepare sample audio for test (Khmer sample & English sample)
    const testDir = path.join(__dirname, '../storage/uploads/cloned-samples');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const sampleKhmerPath = path.join(testDir, 'test-khmer-live.mp3');
    if (!fs.existsSync(sampleKhmerPath)) {
        console.log('[*] Generating test reference audio sample for Khmer...');
        const base64Audio = await googleTTS.getAudioBase64('ជំរាបសួរបងប្អូនទាំងអស់គ្នា នេះជាសំឡេងគំរូសម្រាប់វិភាគប្រេកង់', {
            lang: 'km',
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000
        });
        fs.writeFileSync(sampleKhmerPath, Buffer.from(base64Audio, 'base64'));
    }

    try {
        // TEST 1: POST /api/clone/process (Phase 1: Process and Analyze Hz)
        console.log('\n[TEST 1] Testing POST /api/clone/process (Acoustic Frequency Analysis)...');
        const FormData = require('form-data');
        const axios = require('axios');

        const form1 = new FormData();
        form1.append('referenceAudio', fs.createReadStream(sampleKhmerPath));
        form1.append('voiceName', 'Live Khmer Voice Test');
        form1.append('lang', 'km');

        const res1 = await axios.post(`${baseUrl}/api/clone/process`, form1, {
            headers: form1.getHeaders()
        });

        console.log('   Response Status:', res1.status);
        console.log('   Success:', res1.data.success);
        console.log('   Voice Name:', res1.data.voiceName);
        console.log('   Detected Hz:', res1.data.acoustic?.detectedHz, 'Hz');
        console.log('   Voice Category:', res1.data.acoustic?.voiceCategory);
        console.log('   Neural Base:', res1.data.acoustic?.baseNeuralVoice);
        console.log('   Pitch Offset:', res1.data.acoustic?.pitchOffsetStr);

        if (!res1.data.success || !res1.data.acoustic || !res1.data.acoustic.detectedHz) {
            throw new Error('POST /api/clone/process validation failed');
        }
        console.log('   ✅ TEST 1 PASSED');

        const savedRefPath = res1.data.referenceAudioPath;
        const acousticInfo = res1.data.acoustic;

        // TEST 2: POST /api/clone/test-synthesize (Phase 2: Test Script Synthesis with Morphed Voice)
        console.log('\n[TEST 2] Testing POST /api/clone/test-synthesize (Morphing Synthesis & Timestamps)...');
        const form2 = new FormData();
        form2.append('referenceAudioPath', savedRefPath);
        form2.append('text', 'សួស្តី! នេះគឺជាការធ្វើតេស្តសំឡេង Morphed Voice តាមរយៈ HTTP API។\nសំឡេងនេះត្រូវបានកែប្រែប្រេកង់ Hz ដោយជោគជ័យ។');
        form2.append('voiceName', 'Live Khmer Voice Test');
        form2.append('lang', 'km');

        const res2 = await axios.post(`${baseUrl}/api/clone/test-synthesize`, form2, {
            headers: form2.getHeaders()
        });

        console.log('   Response Status:', res2.status);
        console.log('   Success:', res2.data.success);
        console.log('   Output Audio URL:', res2.data.audioUrl);
        console.log('   Duration:', res2.data.duration, 's');
        console.log('   Timestamps Count:', res2.data.timestamps?.length);
        res2.data.timestamps.forEach(t => console.log(`     ${t.formattedLine}`));

        if (!res2.data.success || !res2.data.audioDataUri || res2.data.timestamps?.length !== 2) {
            throw new Error('POST /api/clone/test-synthesize validation failed');
        }
        console.log('   ✅ TEST 2 PASSED');

        // TEST 3: POST /api/clone/save-voice (Phase 3: Save Voice Profile to Registry)
        console.log('\n[TEST 3] Testing POST /api/clone/save-voice (Save Voice Model)...');
        const res3 = await axios.post(`${baseUrl}/api/clone/save-voice`, {
            voiceName: 'Live Khmer Voice Test',
            lang: 'km',
            referenceAudioPath: savedRefPath,
            acousticData: acousticInfo
        });

        console.log('   Response Status:', res3.status);
        console.log('   Success:', res3.data.success);
        console.log('   Saved Voice ID:', res3.data.voiceId);
        console.log('   Message:', res3.data.message);

        if (!res3.data.success || !res3.data.voiceId) {
            throw new Error('POST /api/clone/save-voice validation failed');
        }
        console.log('   ✅ TEST 3 PASSED');

        const testVoiceId = res3.data.voiceId;

        // TEST 4: GET /api/clone/voices (Retrieve All Voice Profiles)
        console.log('\n[TEST 4] Testing GET /api/clone/voices (Retrieve Cloned Voices)...');
        const res4 = await axios.get(`${baseUrl}/api/clone/voices`);
        console.log('   Total Cloned Voices:', res4.data.count);
        const exists = res4.data.voices.some(v => v.id === testVoiceId);
        console.log('   Newly Created Voice Present:', exists);

        if (!res4.data.success || !exists) {
            throw new Error('GET /api/clone/voices validation failed');
        }
        console.log('   ✅ TEST 4 PASSED');

        // TEST 5: POST /api/tts/synthesize with Cloned Voice (Use Cloned Voice in TTS Studio)
        console.log('\n[TEST 5] Testing POST /api/tts/synthesize with Cloned Voice Profile...');
        const res5 = await axios.post(`${baseUrl}/api/tts/synthesize`, {
            voice: testVoiceId,
            lang: 'km',
            text: 'សាកល្បងប្រើប្រាស់សំឡេងដែលបាន Save ទៅក្នុង Text to Speech។'
        });

        console.log('   Response Status:', res5.status);
        console.log('   Success:', res5.data.success);
        console.log('   TTS Audio URL:', res5.data.audioUrl);
        console.log('   Timestamps Count:', res5.data.timestamps?.length);

        if (!res5.data.success || !res5.data.audioDataUri) {
            throw new Error('TTS with Cloned Voice synthesis failed');
        }
        console.log('   ✅ TEST 5 PASSED');

        // TEST 6: DELETE /api/clone/voices/:id (Clean up Test Voice)
        console.log('\n[TEST 6] Testing DELETE /api/clone/voices/:id (Delete Cloned Voice)...');
        const res6 = await axios.delete(`${baseUrl}/api/clone/voices/${testVoiceId}`);
        console.log('   Deleted Success:', res6.data.success);
        console.log('   Message:', res6.data.message);

        if (!res6.data.success) {
            throw new Error('DELETE /api/clone/voices/:id failed');
        }
        console.log('   ✅ TEST 6 PASSED');

        console.log('\n================================================================');
        console.log('🎉 ALL 6 LIVE HTTP API & DSP CLONING TESTS PASSED (100%)! 🎉');
        console.log('================================================================\n');

    } finally {
        server.close();
    }
}

runLiveHttpTests().catch(err => {
    console.error('❌ HTTP Live test error:', err.response?.data || err.message);
    process.exit(1);
});
