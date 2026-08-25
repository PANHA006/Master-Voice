/**
 * Automated Verification Script for VoxSync AI Voice Models
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const testCases = [
    { category: 'Education', voice: 'km-edu-professor', lang: 'km', text: 'សួស្តីបងប្អូនទាំងអស់គ្នា ស្វាគមន៍មកកាន់មេរៀន' },
    { category: 'Education', voice: 'km-edu-instructor', lang: 'km', text: 'សូមស្វាគមន៍មកកាន់វគ្គបណ្តុះបណ្តាលអនឡាញ' },
    { category: 'Recap', voice: 'km-recap-cinema', lang: 'km', text: 'រឿងរ៉ាវដ៏រន្ធត់បានចាប់ផ្តើមកើតឡើងនៅក្នុងរាត្រីមួយ' },
    { category: 'Recap', voice: 'km-recap-drama', lang: 'km', text: 'នាងបានជួបស្នេហាដំបូងនៅក្នុងសាលារៀន' },
    { category: 'Character', voice: 'km-char-villain', lang: 'km', text: 'ឯងមិនអាចគេចផុតពីកណ្តាប់ដៃយើងបានទេ' },
    { category: 'Character', voice: 'km-char-hero', lang: 'km', text: 'ខ្ញុំនឹងការពារទឹកដីនេះទោះបីជាត្រូវលះបង់ជីវិតក៏ដោយ' },
    { category: 'Kids', voice: 'km-child-boy', lang: 'km', text: 'សួស្តីមិត្តភក្តិតូចៗទាំងអស់គ្នា តោះទៅលេងជាមួយគ្នា' },
    { category: 'Kids', voice: 'km-child-girl', lang: 'km', text: 'តុក្កតារបស់ខ្ញុំស្អាតណាស់ តើអ្នកចង់មើលទេ' },
    { category: 'General Khmer', voice: 'km-KH-PisethNeural', lang: 'km', text: 'សូមស្វាគមន៍មកកាន់ប្រព័ន្ធសំឡេងឆ្លាតវៃ' },
    { category: 'General Khmer', voice: 'km-KH-SreymomNeural', lang: 'km', text: 'ព័ត៌មានជាតិ និងអន្តរជាតិប្រចាំថ្ងៃ' },
    { category: 'English US', voice: 'en-US-JennyNeural', lang: 'en', text: 'Welcome to VoxSync AI Studio, high quality audio synthesis.' },
    { category: 'English UK', voice: 'en-GB-RyanNeural', lang: 'en', text: 'Professional British English speech generation.' },
    { category: 'English AU', voice: 'en-AU-NatashaNeural', lang: 'en', text: 'Australian accent natural speech synthesis.' }
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
    console.log('🎙️ VOXSYNC AI - FULL VOICE MODELS VERIFICATION & TEST');
    console.log('===========================================================');

    let passedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        process.stdout.write(`[${i + 1}/${testCases.length}] Testing [${tc.category}] ${tc.voice}... `);
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
