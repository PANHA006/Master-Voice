const STTService = require('../src/services/stt.service');
const path = require('path');

async function testSTT() {
    console.log('Testing STT with Gemini API Key from .env...');
    const testFile = path.join(__dirname, '../storage/outputs/sample-check.mp3');
    try {
        const res = await STTService.transcribe({
            filePath: testFile,
            mimeType: 'audio/mp3'
        });
        console.log('STT Success:', res.success);
        console.log('Warning message:', res.warning || 'None (Full AI Transcription active)');
        console.log('Transcribed output:');
        res.lines.forEach(l => console.log(`  [${l.timestamp}] ${l.text}`));
    } catch (err) {
        console.error('STT API Error:', err.message);
    }
}

testSTT();
