/**
 * Automated Verification for Custom AI Voice Studio & Acoustic DSP Tuning
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

function makeRequest(pathName, method, payload) {
    return new Promise((resolve) => {
        const bodyStr = payload ? JSON.stringify(payload) : '';
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: pathName,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, error: e.message });
                }
            });
        });

        req.on('error', (err) => {
            resolve({ status: 500, error: err.message });
        });

        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function runCustomStudioTests() {
    console.log('===========================================================');
    console.log('🎛️ TESTING AI VOICE CUSTOMIZER & ACOUSTIC DSP TUNING');
    console.log('===========================================================');

    // 1. Test Custom Preview with Formant + EQ + Compression + Reverb
    process.stdout.write('[1/4] Testing POST /api/tts/custom-preview (DSP Chain)... ');
    const previewRes = await makeRequest('/api/tts/custom-preview', 'POST', {
        text: 'នេះជាការធ្វើតេស្តសាកល្បងសំឡេងកែច្នៃបែបស្ទូឌីយោវិជ្ជាជីវៈ។',
        baseVoice: 'km-KH-PisethNeural',
        lang: 'km',
        pitch: -15,
        formant: 0.85,
        bass: 6,
        mid: 2,
        treble: 4,
        compression: 'radio',
        reverb: 'room'
    });

    let savedVoiceId = null;
    if (previewRes.status === 200 && previewRes.data && previewRes.data.success && previewRes.data.audioUrl) {
        console.log(`✅ PASS (${previewRes.data.duration}s, file: ${previewRes.data.fileName})`);
    } else {
        console.log(`❌ FAIL: ${JSON.stringify(previewRes.data || previewRes.error)}`);
    }

    // 2. Test Save Custom Voice Model
    process.stdout.write('[2/4] Testing POST /api/tts/custom-save... ');
    const saveRes = await makeRequest('/api/tts/custom-save', 'POST', {
        name: 'My Cinema Pro Deep',
        baseVoice: 'km-KH-PisethNeural',
        lang: 'km',
        pitch: -20,
        formant: 0.75,
        bass: 8,
        mid: -2,
        treble: 3,
        compression: 'medium',
        reverb: 'booth'
    });

    if (saveRes.status === 200 && saveRes.data && saveRes.data.success && saveRes.data.voice) {
        savedVoiceId = saveRes.data.voice.id;
        console.log(`✅ PASS (Saved Model ID: ${savedVoiceId})`);
    } else {
        console.log(`❌ FAIL: ${JSON.stringify(saveRes.data || saveRes.error)}`);
    }

    // 3. Test Synthesizing using the saved Custom Voice ID
    if (savedVoiceId) {
        process.stdout.write(`[3/4] Testing POST /api/tts/synthesize with Custom Voice ID (${savedVoiceId})... `);
        const synthRes = await makeRequest('/api/tts/synthesize', 'POST', {
            text: 'សួស្តីបងប្អូន នេះជាសំឡេងដែលបានបង្កើតចេញពី Custom Voice Model!',
            voice: savedVoiceId,
            lang: 'km',
            rate: 1.0
        });

        if (synthRes.status === 200 && synthRes.data && synthRes.data.success && synthRes.data.audioUrl) {
            console.log(`✅ PASS (${synthRes.data.duration}s, ${synthRes.data.fileName})`);
        } else {
            console.log(`❌ FAIL: ${JSON.stringify(synthRes.data || synthRes.error)}`);
        }

        // 4. Test Deleting the Custom Voice Model
        process.stdout.write(`[4/4] Testing DELETE /api/tts/custom-voice/${savedVoiceId}... `);
        const delRes = await makeRequest(`/api/tts/custom-voice/${encodeURIComponent(savedVoiceId)}`, 'DELETE');
        if (delRes.status === 200 && delRes.data && delRes.data.success) {
            console.log('✅ PASS (Cleaned up successfully)');
        } else {
            console.log(`❌ FAIL: ${JSON.stringify(delRes.data || delRes.error)}`);
        }
    }

    console.log('===========================================================');
    console.log('🎉 ALL CUSTOM VOICE STUDIO TESTS COMPLETED!');
    console.log('===========================================================');
}

runCustomStudioTests();
