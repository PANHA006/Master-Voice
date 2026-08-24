const { applyVoiceProfile, VOICE_PRESETS } = require('../src/utils/voice-filter.util');
const path = require('path');
const fs = require('fs');

async function testFilters() {
    console.log('VOICE_PRESETS keys:', Object.keys(VOICE_PRESETS));

    // Find a test audio file in storage/outputs
    const outputs = fs.readdirSync('storage/outputs').filter(f => f.endsWith('.mp3') && !f.startsWith('raw-'));
    if (outputs.length === 0) {
        console.log('No mp3 files in storage/outputs');
        return;
    }
    const sample = path.join('storage/outputs', outputs[0]);
    console.log('Using sample:', sample);

    for (let voice of ['km-pros', 'km-srey', 'km-KH-PisethNeural', 'km-KH-SreymomNeural', 'km-news', 'km-story']) {
        const out = path.join('storage/outputs', `test-filtered-${voice}.mp3`);
        await applyVoiceProfile(sample, out, voice);
        console.log(`Filter for ${voice} generated:`, fs.existsSync(out) ? `size ${fs.statSync(out).size}` : 'NOT FOUND');
    }
}

testFilters();
