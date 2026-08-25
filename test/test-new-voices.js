/**
 * Automated Verification Script for Expanded Voice Models Library
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const testCases = [
    // New Business
    { category: 'Business', voice: 'km-biz-entrepreneur', lang: 'km', text: 'យុទ្ធសាស្ត្រពង្រីកទីផ្សារ និងការគ្រប់គ្រងហិរញ្ញវត្ថុ' },
    { category: 'Business', voice: 'km-biz-financial', lang: 'km', text: 'ការវិភាគទីផ្សារភាគហ៊ុន និងសេដ្ឋកិច្ចពិភពលោក' },
    // New News
    { category: 'News', voice: 'km-news-anchor-m', lang: 'km', text: 'សូមស្វាគមន៍មកកាន់ការផ្សាយព័ត៌មានជាតិពេលរាត្រី' },
    { category: 'News', voice: 'km-news-sports', lang: 'km', text: 'ការប្រកួតបាល់ទាត់ដ៏ជក់ចិត្តបានបញ្ចប់ទៅដោយជ័យជម្នះ' },
    // New Audiobook & ASMR
    { category: 'Storytelling', voice: 'km-audiobook-fantasy', lang: 'km', text: 'កាលពីព្រេងនាយ មានព្រះរាជាណាចក្រដ៏ធំទូលាយមួយ' },
    { category: 'Storytelling', voice: 'km-radio-latenight', lang: 'km', text: 'រាត្រីស្ងប់ស្ងាត់ សូមឱ្យអ្នកទាំងអស់គ្នាគេងលក់ស្រួល' },
    // New Gaming & Tech
    { category: 'Entertainment', voice: 'km-game-streamer', lang: 'km', text: 'សួស្តីអ្នកទាំងអស់គ្នា ស្វាគមន៍មកកាន់ការ Live Game ថ្ងៃនេះ' },
    { category: 'Entertainment', voice: 'km-tech-ai-bot', lang: 'km', text: 'ប្រព័ន្ធបញ្ញាសិប្បនិម្មិត AI បានត្រៀមខ្លួនជាស្រេច' },
    // New Characters
    { category: 'Character', voice: 'km-char-detective', lang: 'km', text: 'មានតម្រុយអាថ៌កំបាំងមួយដែលយើងមិនត្រូវមើលរំលង' },
    { category: 'Character', voice: 'km-char-queen', lang: 'km', text: 'យើងសូមប្រកាសនូវរាជបញ្ជាដល់ប្រជារាស្ត្រទាំងអស់' },
    // International
    { category: 'International (JP)', voice: 'ja-JP-NanamiNeural', lang: 'ja', text: 'こんにちは！ VoxSync AI へようこそ。' },
    { category: 'International (KR)', voice: 'ko-KR-SunHiNeural', lang: 'ko', text: '안녕하세요! 반갑습니다.' },
    { category: 'International (CN)', voice: 'zh-CN-XiaoxiaoNeural', lang: 'zh', text: '您好！欢迎使用智能语音系统。' },
    { category: 'International (TH)', voice: 'th-TH-PremwadeeNeural', lang: 'th', text: 'สวัสดีค่ะ ยินดีต้อนรับค่ะ' },
    { category: 'International (FR)', voice: 'fr-FR-DeniseNeural', lang: 'fr', text: 'Bonjour et bienvenue sur VoxSync AI.' }
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
    console.log('🎙️ TESTING NEWLY ADDED VOICE MODELS (KHMER & INTERNATIONAL)');
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
