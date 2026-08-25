/**
 * Automated Verification for Health, Travel, Food, Gadget & Classical Epic Voices
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const testCases = [
    // Health
    { category: 'Health', voice: 'km-med-doctor-m', lang: 'km', text: 'សូមពិនិត្យសុខភាពបេះដូង និងវាស់សម្ពាធឈាមឱ្យបានទៀងទាត់។' },
    { category: 'Health', voice: 'km-med-nurse-f', lang: 'km', text: 'សូមសម្រាកឱ្យបានច្រើន និងញ៉ាំទឹកឱ្យបានគ្រប់គ្រាន់។' },
    // Travel
    { category: 'Travel', voice: 'km-travel-guide-m', lang: 'km', text: 'សូមស្វាគមន៍មកកាន់ប្រាសាទបុរាណអង្គរវត្តនៃកម្ពុជា។' },
    { category: 'Travel', voice: 'km-travel-vlogger-f', lang: 'km', text: 'ថ្ងៃនេះខ្ញុំនឹងនាំអ្នកទាំងអស់គ្នាទៅដើរលេងនៅមាត់សមុទ្រ។' },
    // Food
    { category: 'Food', voice: 'km-food-chef-m', lang: 'km', text: 'ជំហានដំបូងត្រូវបុកគ្រឿងឱ្យម៉ត់ រួចដាក់បំពងជាមួយប្រេងឆា។' },
    { category: 'Food', voice: 'km-food-reviewer-f', lang: 'km', text: 'ម្ហូបនេះឈ្ងុយឆ្ងាញ់មែនទែន រសជាតិដើមបែបខ្មែរពិតៗ។' },
    // Tech & Auto
    { category: 'Auto', voice: 'km-tech-automotive', lang: 'km', text: 'រថយន្តស៊េរីថ្មីនេះបំពាក់ដោយម៉ាស៊ីនទួរបូ និងប្រព័ន្ធសុវត្ថិភាពខ្ពស់។' },
    { category: 'Gadget', voice: 'km-tech-gadget', lang: 'km', text: 'ស្មាតហ្វូននេះមានអេក្រង់ច្បាស់ត្រជាក់ភ្នែក និងថាមពលថ្មធំ។' },
    // Classical Epic
    { category: 'Epic', voice: 'km-char-king', lang: 'km', text: 'យើងសូមប្រកាសស្ថាបនាអាណាចក្រឱ្យរុងរឿងជានិរន្តរ៍។' },
    { category: 'Epic', voice: 'km-char-general-warrior', lang: 'km', text: 'កងទ័ពទាំងអស់ត្រូវតែត្រៀមខ្លួនការពារមាតុភូមិ។' },
    { category: 'Epic', voice: 'km-char-sorcerer', lang: 'km', text: 'វេទមន្តមហាគាថានឹងបើកផ្លូវឱ្យយើងសម្រេចបំណង។' },
    { category: 'Epic', voice: 'km-char-princess-fairy', lang: 'km', text: 'សូមឱ្យទឹកដីខ្មែរពោរពេញដោយសេចក្តីសុខក្សេមក្សាន្ត។' }
];

function testSingleVoice(tc) {
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            voice: tc.voice,
            lang: tc.lang,
            text: tc.text,
            rate: 1.0
        });

        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/tts/synthesize',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.success && json.audioUrl) {
                        const filePath = path.join(__dirname, '../storage/outputs', json.fileName);
                        const fileExists = fs.existsSync(filePath);
                        const fileSize = fileExists ? fs.statSync(filePath).size : 0;
                        resolve({
                            pass: true,
                            voice: tc.voice,
                            category: tc.category,
                            lang: tc.lang,
                            fileName: json.fileName,
                            duration: json.duration,
                            fileSize,
                            fileExists
                        });
                    } else {
                        resolve({
                            pass: false,
                            voice: tc.voice,
                            category: tc.category,
                            error: json.error || data
                        });
                    }
                } catch (e) {
                    resolve({
                        pass: false,
                        voice: tc.voice,
                        category: tc.category,
                        error: e.message
                    });
                }
            });
        });

        req.on('error', (err) => {
            resolve({
                pass: false,
                voice: tc.voice,
                category: tc.category,
                error: err.message
            });
        });

        req.write(payload);
        req.end();
    });
}

async function runAllTests() {
    console.log('===========================================================');
    console.log('🎙️ TESTING EXTRA NEW KHMER VOICE PERSONAS');
    console.log('===========================================================');

    let passedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        process.stdout.write(`[${i + 1}/${testCases.length}] [${tc.category}] ${tc.voice}... `);
        const result = await testSingleVoice(tc);

        if (result.pass && result.fileExists && result.fileSize > 1000) {
            passedCount++;
            console.log(`✅ PASS (${result.duration}s, ${Math.round(result.fileSize / 1024)} KB)`);
        } else {
            failedCount++;
            console.log(`❌ FAIL: ${result.error || 'File size too small or missing'}`);
        }
        await new Promise(r => setTimeout(r, 600));
    }

    console.log('===========================================================');
    console.log(`📊 TEST SUMMARY: ${passedCount}/${testCases.length} PASSED (${Math.round((passedCount / testCases.length) * 100)}%)`);
    console.log('===========================================================');
}

runAllTests();
