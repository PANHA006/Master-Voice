const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3000';

async function scanAndTestAllVoices() {
    console.log('================================================================');
    console.log('🔍 SCANNING & TESTING ALL REGISTERED VOICE MODELS IN VOXSYNC AI');
    console.log('================================================================\n');

    // 1. Fetch available voices
    console.log('1️⃣ Fetching registered voice models from API...');
    const voicesRes = await fetch(`${BASE_URL}/api/tts/voices`);
    const voicesData = await voicesRes.json();

    if (!voicesData.success || !voicesData.voices) {
        console.error('❌ Failed to fetch voice models:', voicesData);
        process.exit(1);
    }

    const kmVoices = voicesData.voices.km || [];
    const enVoices = voicesData.voices.en || [];

    console.log(`✅ Found ${kmVoices.length} Khmer voice(s) and ${enVoices.length} English voice(s).\n`);

    const testResults = [];

    // Test text samples
    const kmText = 'សូមស្វាគមន៍មកកាន់ VoxSync AI Studio។ នេះជាការសាកល្បងសំឡេងនិយាយ។';
    const enText = 'Welcome to VoxSync AI Studio. This is a voice model synthesis test.';

    // 2. Test every Khmer Voice Model
    console.log('----------------------------------------------------------------');
    console.log('🇰🇭 TESTING KHMER VOICE MODELS (SYNTHESIS & AUDIO VERIFICATION)');
    console.log('----------------------------------------------------------------');

    for (const v of kmVoices) {
        process.stdout.write(`👉 Testing [${v.name}] (ID: ${v.id})... `);
        const startTime = Date.now();

        try {
            const res = await fetch(`${BASE_URL}/api/tts/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: kmText,
                    voice: v.id,
                    lang: 'km',
                    rate: 1.0
                })
            });

            const data = await res.json();
            const elapsed = Date.now() - startTime;

            if (res.ok && data.success && data.fileName) {
                const filePath = path.join(__dirname, '../storage/outputs', data.fileName);
                const fileExists = fs.existsSync(filePath);
                const fileSize = fileExists ? fs.statSync(filePath).size : 0;

                if (fileExists && fileSize > 0) {
                    console.log(`✅ PASS (${elapsed}ms | File: ${data.fileName} | Size: ${(fileSize / 1024).toFixed(1)} KB)`);
                    testResults.push({
                        name: v.name,
                        id: v.id,
                        lang: 'km',
                        status: 'PASS',
                        duration: data.duration,
                        sizeKB: (fileSize / 1024).toFixed(1),
                        timestampsCount: data.timestamps?.length || 0,
                        elapsedMs: elapsed
                    });
                } else {
                    console.log(`❌ FAIL (File missing or 0 bytes)`);
                    testResults.push({ name: v.name, id: v.id, lang: 'km', status: 'FAIL', error: 'File size 0' });
                }
            } else {
                console.log(`❌ FAIL (${data.error || 'Unknown error'})`);
                testResults.push({ name: v.name, id: v.id, lang: 'km', status: 'FAIL', error: data.error });
            }
        } catch (err) {
            console.log(`❌ ERROR (${err.message})`);
            testResults.push({ name: v.name, id: v.id, lang: 'km', status: 'ERROR', error: err.message });
        }
    }

    // 3. Test every English Voice Model
    console.log('\n----------------------------------------------------------------');
    console.log('🇺🇸 TESTING ENGLISH VOICE MODELS (SYNTHESIS & AUDIO VERIFICATION)');
    console.log('----------------------------------------------------------------');

    for (const v of enVoices) {
        process.stdout.write(`👉 Testing [${v.name}] (ID: ${v.id})... `);
        const startTime = Date.now();

        try {
            const res = await fetch(`${BASE_URL}/api/tts/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: enText,
                    voice: v.id,
                    lang: 'en',
                    rate: 1.0
                })
            });

            const data = await res.json();
            const elapsed = Date.now() - startTime;

            if (res.ok && data.success && data.fileName) {
                const filePath = path.join(__dirname, '../storage/outputs', data.fileName);
                const fileExists = fs.existsSync(filePath);
                const fileSize = fileExists ? fs.statSync(filePath).size : 0;

                if (fileExists && fileSize > 0) {
                    console.log(`✅ PASS (${elapsed}ms | File: ${data.fileName} | Size: ${(fileSize / 1024).toFixed(1)} KB)`);
                    testResults.push({
                        name: v.name,
                        id: v.id,
                        lang: 'en',
                        status: 'PASS',
                        duration: data.duration,
                        sizeKB: (fileSize / 1024).toFixed(1),
                        timestampsCount: data.timestamps?.length || 0,
                        elapsedMs: elapsed
                    });
                } else {
                    console.log(`❌ FAIL (File missing or 0 bytes)`);
                    testResults.push({ name: v.name, id: v.id, lang: 'en', status: 'FAIL', error: 'File size 0' });
                }
            } else {
                console.log(`❌ FAIL (${data.error || 'Unknown error'})`);
                testResults.push({ name: v.name, id: v.id, lang: 'en', status: 'FAIL', error: data.error });
            }
        } catch (err) {
            console.log(`❌ ERROR (${err.message})`);
            testResults.push({ name: v.name, id: v.id, lang: 'en', status: 'ERROR', error: err.message });
        }
    }

    // Summary Table
    console.log('\n================================================================');
    console.log('📊 FINAL TEST SCAN SUMMARY');
    console.log('================================================================');
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const total = testResults.length;
    console.log(`Total Models Scanned: ${total}`);
    console.log(`Passed: ${passed} / ${total} (${Math.round((passed / total) * 100)}%)`);

    if (passed === total) {
        console.log('\n🎉 ALL VOICE MODELS SCANNED & GENERATING 100% SUCCESSFULLY!');
    } else {
        console.log('\n⚠️ Some voice models encountered issues.');
    }
}

scanAndTestAllVoices();
