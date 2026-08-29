/**
 * Test Voice Persistence & Portability across different computers/environments
 */
const fs = require('fs');
const path = require('path');
const TTSService = require('../src/services/tts.service');
const VoiceManager = require('../src/utils/voice-manager.util');

async function runPersistenceTest() {
    console.log('========================================================================');
    console.log('🧪 TESTING VOICE MODELS PERSISTENCE & PORTABILITY (GITHUB PULL SIMULATION)');
    console.log('========================================================================\n');

    let passed = 0;
    let total = 0;

    function assert(name, condition, extra = '') {
        total++;
        if (condition) {
            passed++;
            console.log(`✅ [TEST ${total}] PASS: ${name} ${extra}`);
        } else {
            console.error(`❌ [TEST ${total}] FAIL: ${name} ${extra}`);
        }
    }

    // 1. Check Preferences file exists and contains default favorites
    const prefs = VoiceManager.getPreferences();
    assert('Voice Preferences Loaded', prefs && Array.isArray(prefs.favorites) && prefs.favorites.length >= 5, `(${prefs.favorites.length} favorites found)`);

    // 2. Check Cloned Voices Loaded from JSON
    const clonedVoices = VoiceManager.getClonedVoices();
    assert('Cloned Voices Loaded from storage/cloned-voices.json', clonedVoices.length >= 3, `(${clonedVoices.map(v => v.name).join(', ')})`);

    // 3. Check Custom AI Voices Loaded from JSON
    const customVoices = VoiceManager.getCustomVoices();
    assert('Custom AI Voices Loaded from storage/custom-voices.json', customVoices.length >= 4, `(${customVoices.map(v => v.name).join(', ')})`);

    // 4. Test Synthesis with Cloned Voice "panha" (Simulating no local reference audio)
    try {
        console.log('\n[*] Synthesizing with Cloned Voice "panha"...');
        const resPanha = await TTSService.synthesize({
            text: 'សួស្តី ខ្ញុំជាសំឡេងក្លូនឈ្មោះបញ្ញា។',
            voice: 'cloned-1787562721953',
            lang: 'km',
            rate: 1.15
        });
        assert('Cloned Voice "panha" Synthesis', resPanha.success === true && resPanha.duration > 0, `(Duration: ${resPanha.duration}s, File: ${resPanha.fileName})`);
    } catch (e) {
        assert('Cloned Voice "panha" Synthesis', false, e.message);
    }

    // 5. Test Synthesis with Cloned Voice "My Cloned Voice"
    try {
        console.log('\n[*] Synthesizing with "My Cloned Voice"...');
        const resMyCloned = await TTSService.synthesize({
            text: 'នេះជាការសាកល្បងសំឡេង My Cloned Voice។',
            voice: 'cloned-1787566066619',
            lang: 'km',
            rate: 1.0
        });
        assert('Cloned Voice "My Cloned Voice" Synthesis', resMyCloned.success === true && resMyCloned.duration > 0, `(Duration: ${resMyCloned.duration}s)`);
    } catch (e) {
        assert('Cloned Voice "My Cloned Voice" Synthesis', false, e.message);
    }

    // 6. Test Synthesis with Custom AI Model "PICH"
    try {
        console.log('\n[*] Synthesizing with Custom AI Model "PICH"...');
        const resPich = await TTSService.synthesize({
            text: 'ខ្ញុំជាសំឡេងកែច្នៃផ្ទាល់ខ្លួន ពេជ្រ។',
            voice: 'custom-1787646632200-8452',
            lang: 'km',
            rate: 1.0
        });
        assert('Custom Voice "PICH" Synthesis', resPich.success === true && resPich.duration > 0, `(Duration: ${resPich.duration}s)`);
    } catch (e) {
        assert('Custom Voice "PICH" Synthesis', false, e.message);
    }

    // 7. Test Synthesis with Custom AI Model "Custom Lika"
    try {
        console.log('\n[*] Synthesizing with Custom AI Model "Custom Lika"...');
        const resLika = await TTSService.synthesize({
            text: 'ខ្ញុំជាសំឡេងកែច្នៃផ្ទាល់ខ្លួន លីកា។',
            voice: 'custom-1787646217612-2750',
            lang: 'km',
            rate: 1.0
        });
        assert('Custom Voice "Custom Lika" Synthesis', resLika.success === true && resLika.duration > 0, `(Duration: ${resLika.duration}s)`);
    } catch (e) {
        assert('Custom Voice "Custom Lika" Synthesis', false, e.message);
    }

    // 8. Test Synthesis with Custom AI Model "My Cinema Pro Deep"
    try {
        console.log('\n[*] Synthesizing with Custom AI Model "My Cinema Pro Deep"...');
        const resCinema = await TTSService.synthesize({
            text: 'សូមស្វាគមន៍មកកាន់ការសម្រាយរឿងភាពយន្តកម្រិតខ្ពស់។',
            voice: 'custom-1787645811135-4009',
            lang: 'km',
            rate: 1.0
        });
        assert('Custom Voice "My Cinema Pro Deep" Synthesis', resCinema.success === true && resCinema.duration > 0, `(Duration: ${resCinema.duration}s)`);
    } catch (e) {
        assert('Custom Voice "My Cinema Pro Deep" Synthesis', false, e.message);
    }

    // 9. Verify GET /api/tts/voices returns full payload with preferences
    try {
        const res = await fetch('http://localhost:3000/api/tts/voices');
        const data = await res.json();
        const hasKm = data.voices && data.voices.km && data.voices.km.length > 50;
        const hasPrefs = data.preferences && data.preferences.favorites.length > 0;
        assert('API /api/tts/voices Full Payload & Preferences', data.success && hasKm && hasPrefs, `(${data.voices.km.length} Khmer voices, ${data.preferences.favorites.length} default favorites)`);
    } catch (e) {
        assert('API /api/tts/voices Full Payload & Preferences', false, e.message);
    }

    console.log('\n========================================================================');
    console.log(`🏁 PERSISTENCE TEST SUMMARY: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log('========================================================================\n');

    if (passed < total) {
        process.exit(1);
    }
}

runPersistenceTest().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
