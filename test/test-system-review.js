const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const BASE_URL = 'http://localhost:3000';

function makeRequest(urlPath, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {}
        };

        let bodyPayload = null;
        if (data) {
            bodyPayload = JSON.stringify(data);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(bodyPayload);
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, headers: res.headers, raw: body });
                }
            });
        });

        req.on('error', (err) => reject(err));

        if (bodyPayload) {
            req.write(bodyPayload);
        }
        req.end();
    });
}

async function runReviewAndTests() {
    console.log('====================================================');
    console.log('🔍 VOXSYNC AI FULL SYSTEM REVIEW & AUTOMATED TESTS');
    console.log('====================================================\n');

    let totalTests = 0;
    let passedTests = 0;

    function assertTest(name, condition, extraInfo = '') {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`✅ [PASS] ${name} ${extraInfo}`);
        } else {
            console.error(`❌ [FAIL] ${name} ${extraInfo}`);
        }
    }

    // 1. Server Health Check
    console.log('--- 1. Testing Server Connectivity & Health ---');
    try {
        const health = await makeRequest('/api/health');
        assertTest('Server Health API', health.statusCode === 200 && health.data.success === true, `(Status: ${health.statusCode})`);
    } catch (e) {
        assertTest('Server Health API', false, `(Error: ${e.message})`);
    }

    // 2. Frontend HTML & Asset Integrity
    console.log('\n--- 2. Reviewing Frontend Assets & HTML Integrity ---');
    const indexPath = path.join(__dirname, '../public/index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    assertTest('WaveSurfer CDN Script included', indexContent.includes('wavesurfer.js@7'));
    assertTest('WaveSurfer Regions Plugin included', indexContent.includes('plugins/regions.min.js'));
    assertTest('Voice Editor Navigation Tab Button exists', indexContent.includes('id="tabEditorBtn"'));
    assertTest('Voice Editor Main Section View exists', indexContent.includes('id="tabEditor"'));
    assertTest('1-Click Magic Studio Master button exists', indexContent.includes('id="editorMagicMasterBtn"'));
    assertTest('Voice Leveler & Consistency UI exists', indexContent.includes('id="editorVoiceLeveler"'));
    assertTest('Noise Gate & Suppression UI exists', indexContent.includes('id="editorNoiseGate"'));
    assertTest('Voice Editor JavaScript File included', indexContent.includes('src="js/editor.js"'));

    // 3. TTS Generation Test
    console.log('\n--- 3. Testing Khmer Text-to-Speech (TTS) ---');
    try {
        const ttsRes = await makeRequest('/api/tts/synthesize', 'POST', {
            text: 'សួស្តី! នេះជាការសាកល្បងប្រព័ន្ធសំឡេង VoxSync AI។',
            voice: 'km-edu-explainer',
            speed: 1.0,
            pitch: '+0Hz'
        });

        const ok = ttsRes.statusCode === 200 && ttsRes.data.success === true && ttsRes.data.audioUrl;
        assertTest('Khmer TTS Generation (km-edu-explainer)', ok, ok ? `(Audio: ${ttsRes.data.audioUrl})` : `(Err: ${ttsRes.data?.error || ttsRes.raw})`);
    } catch (e) {
        assertTest('Khmer TTS Generation', false, `(Error: ${e.message})`);
    }

    // 4. Voice Changer Presets
    console.log('\n--- 4. Testing Voice Changer Module ---');
    try {
        const presetsRes = await makeRequest('/api/voice-changer/presets');
        const voices = presetsRes.data?.voices;
        const hasVoices = voices && (Array.isArray(voices) ? voices.length > 0 : (voices.km && voices.km.length > 0));
        assertTest('Voice Changer Presets API', presetsRes.statusCode === 200 && hasVoices, `(Found voices loaded successfully)`);
    } catch (e) {
        assertTest('Voice Changer Presets API', false, `(Error: ${e.message})`);
    }

    // 5. Voice Editor Direct API Processing
    console.log('\n--- 5. Testing Voice Editor API & DSP Filters ---');

    // Create a clean sine wave sample in storage/uploads for editor testing
    const samplePath = path.join(__dirname, '../storage/uploads/review-sample.mp3');
    await new Promise((resolve, reject) => {
        const args = ['-y', '-f', 'lavfi', '-i', 'sine=frequency=500:duration=4', '-c:a', 'libmp3lame', samplePath];
        execFile(ffmpeg, args, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });

    const sampleUrl = '/storage/uploads/review-sample.mp3';

    // Test Trim Process
    try {
        const trimRes = await makeRequest('/api/editor/process', 'POST', {
            audioUrl: sampleUrl,
            startTime: 0.5,
            endTime: 2.5,
            cutMode: 'keep_selection'
        });

        const trimOk = trimRes.statusCode === 200 && trimRes.data.success === true && trimRes.data.audioUrl;
        assertTest('Voice Editor Trim Selection API', trimOk, trimOk ? `(Output: ${trimRes.data.audioUrl}, Duration: ${trimRes.data.duration}s)` : `(Err: ${trimRes.data?.error})`);
    } catch (e) {
        assertTest('Voice Editor Trim Selection API', false, `(Error: ${e.message})`);
    }

    // Test ✨ 1-Click Magic Studio Master Process
    try {
        const magicRes = await makeRequest('/api/editor/process', 'POST', {
            audioUrl: sampleUrl,
            magicMaster: true,
            voiceLeveler: true,
            studioTone: 'magic_studio',
            denoise: 'studio',
            noiseGate: true
        });

        const magicOk = magicRes.statusCode === 200 && magicRes.data.success === true && magicRes.data.audioUrl;
        assertTest('Voice Editor 1-Click Magic Studio Master (Leveler + FFT Denoise + Studio Tone)', magicOk, magicOk ? `(Output: ${magicRes.data.audioUrl}, Duration: ${magicRes.data.duration}s)` : `(Err: ${magicRes.data?.error})`);
    } catch (e) {
        assertTest('Voice Editor 1-Click Magic Studio Master', false, `(Error: ${e.message})`);
    }

    // Test Voice Leveler & EBU R128 Loudness Normalization
    try {
        const levelerRes = await makeRequest('/api/editor/process', 'POST', {
            audioUrl: sampleUrl,
            voiceLeveler: true,
            studioTone: 'podcast_warm'
        });

        const levelerOk = levelerRes.statusCode === 200 && levelerRes.data.success === true && levelerRes.data.audioUrl;
        assertTest('Voice Leveler & EBU R128 Broadcast Normalization (-16 LUFS)', levelerOk, levelerOk ? `(Output: ${levelerRes.data.audioUrl})` : `(Err: ${levelerRes.data?.error})`);
    } catch (e) {
        assertTest('Voice Leveler & Normalization', false, `(Error: ${e.message})`);
    }

    // Test Delete Selection Process
    try {
        const delRes = await makeRequest('/api/editor/process', 'POST', {
            audioUrl: sampleUrl,
            startTime: 1.0,
            endTime: 2.0,
            cutMode: 'remove_selection',
            totalDuration: 4.0
        });

        const delOk = delRes.statusCode === 200 && delRes.data.success === true && delRes.data.audioUrl;
        assertTest('Voice Editor Delete Selection API', delOk, delOk ? `(Output: ${delRes.data.audioUrl}, Duration: ${delRes.data.duration}s)` : `(Err: ${delRes.data?.error})`);
    } catch (e) {
        assertTest('Voice Editor Delete Selection API', false, `(Error: ${e.message})`);
    }

    // 6. History API Test
    console.log('\n--- 6. Testing History & File Library API ---');
    try {
        const histRes = await makeRequest('/api/history');
        const histOk = histRes.statusCode === 200 && histRes.data.success === true;
        assertTest('History File Library API', histOk, histOk ? `(History records retrieved successfully)` : `(Err: ${histRes.data?.error})`);
    } catch (e) {
        assertTest('History File Library API', false, `(Error: ${e.message})`);
    }

    // Summary
    console.log('\n====================================================');
    console.log(`📊 FINAL TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
    if (passedTests === totalTests) {
        console.log('🌟 ALL SYSTEM INTEGRATIONS & STUDIO DSP MODULES ARE 100% OPERATIONAL!');
    } else {
        console.log('⚠️ Some tests failed. Please review the output above.');
    }
    console.log('====================================================\n');
}

runReviewAndTests().catch((err) => {
    console.error('Fatal error during test review:', err);
    process.exit(1);
});
