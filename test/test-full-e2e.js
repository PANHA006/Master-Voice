const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const TTSService = require('../src/services/tts.service');
const STTService = require('../src/services/stt.service');
const CloneService = require('../src/services/clone.service');
const VoiceManager = require('../src/utils/voice-manager.util');

async function runFullComprehensiveTests() {
    console.log('========================================================================');
    console.log('🚀 VOXSYNC AI - COMPREHENSIVE END-TO-END AUTOMATED TEST SUITE');
    console.log('========================================================================\n');

    let passedTests = 0;
    let totalTests = 0;

    function assertTest(name, condition, extra = '') {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`✅ [TEST ${totalTests}] PASS: ${name} ${extra}`);
        } else {
            console.error(`❌ [TEST ${totalTests}] FAIL: ${name} ${extra}`);
        }
    }

    // -------------------------------------------------------------
    // TEST 1: Server Health Check
    // -------------------------------------------------------------
    try {
        const healthRes = await fetch('http://localhost:3000/api/health');
        const healthData = await healthRes.json();
        assertTest('Server Online & Health Check', healthData.success === true, `(Status: ${healthData.status})`);
    } catch (e) {
        assertTest('Server Online & Health Check', false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 2: Multi-Speaker Khmer Neural Voice Models
    // -------------------------------------------------------------
    try {
        const voices = VoiceManager.getAllVoices();
        const khmerVoices = voices.km || [];
        assertTest('Khmer Neural Voice Models Availability', khmerVoices.length >= 2, `(${khmerVoices.length} voices registered)`);
    } catch (e) {
        assertTest('Khmer Neural Voice Models Availability', false, e.message);
    }

    let resPros;
    // -------------------------------------------------------------
    // TEST 3: Khmer Male Voice (km-KH-PisethNeural) Synthesis
    // -------------------------------------------------------------
    try {
        resPros = await TTSService.synthesize({
            text: 'សូមស្វាគមន៍ ខ្ញុំជាសំឡេងប្រុស ពិសិដ្ឋ',
            voice: 'km-KH-PisethNeural',
            lang: 'km',
            rate: 1.0
        });
        assertTest('Khmer Male Voice (km-KH-PisethNeural) Synthesis', resPros.success === true && resPros.fileName.endsWith('.mp3'), `(File: ${resPros.fileName})`);
    } catch (e) {
        assertTest('Khmer Male Voice (km-KH-PisethNeural) Synthesis', false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 4: Khmer Female Voice (km-KH-SreymomNeural) Synthesis
    // -------------------------------------------------------------
    try {
        const resFemale = await TTSService.synthesize({
            text: 'សូមស្វាគមន៍ ខ្ញុំជាសំឡេងស្រី ស្រីមុំ',
            voice: 'km-KH-SreymomNeural',
            lang: 'km',
            rate: 1.0
        });
        assertTest('Khmer Female Voice (km-KH-SreymomNeural) Synthesis', resFemale.success === true && resFemale.fileName.endsWith('.mp3'), `(File: ${resFemale.fileName})`);
    } catch (e) {
        assertTest('Khmer Female Voice (km-KH-SreymomNeural) Synthesis', false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 5: Speed Scaling Timestamp Alignment (1.40x Speed)
    // -------------------------------------------------------------
    try {
        const script = `សូមស្វាគមន៍មកកាន់ VoxSync AI ដែលជាកម្មវិធីបំប្លែងសំឡេងដ៏ឆ្លាតវៃ។\nទទួលបានសំឡេងនិយាយធម្មជាតិ ជាមួយការកំណត់ពេលវេលាជាក់លាក់។\nអ្នកអាចបំប្លែងអត្ថបទទៅជាសំឡេង និងសំឡេងទៅជាអត្ថបទយ៉ាងងាយស្រួល។\nសូមអរគុណសម្រាប់ការប្រើប្រាស់សេវាកម្មរបស់យើង។`;
        const resSpeed = await TTSService.synthesize({
            text: script,
            lang: 'km',
            rate: 1.4
        });
        const lastTimestampSec = resSpeed.timestamps[resSpeed.timestamps.length - 1].seconds;
        const isAligned = lastTimestampSec < resSpeed.duration;
        assertTest('Speed 1.40x Timestamp Alignment', isAligned, `(Last TS: ${lastTimestampSec}s < Total: ${resSpeed.duration}s)`);
    } catch (e) {
        assertTest('Speed 1.40x Timestamp Alignment', false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 6: Live Gemini Speech-to-Text Transcription
    // -------------------------------------------------------------
    try {
        const sampleAudio = resPros?.fileName 
            ? path.join(__dirname, '../storage/outputs', resPros.fileName)
            : path.join(__dirname, '../storage/outputs/sample-check.mp3');
        const sttRes = await STTService.transcribe({
            filePath: sampleAudio,
            mimeType: 'audio/mp3'
        });
        assertTest('Live Gemini Speech-to-Text (STT)', sttRes.success === true && sttRes.lines.length > 0 && !sttRes.warning, `(Transcribed: "${sttRes.lines[0]?.text}")`);
    } catch (e) {
        assertTest('Live Gemini Speech-to-Text (STT)', false, e.message);
    }

    // -------------------------------------------------------------
    // TEST 7: Voice Cloning & Auto-Populate to Voice Dropdown
    // -------------------------------------------------------------
    try {
        const sampleAudio = resPros?.fileName 
            ? path.join(__dirname, '../storage/outputs', resPros.fileName)
            : path.join(__dirname, '../storage/outputs/sample-check.mp3');
        const cloneRes = await CloneService.cloneAndSynthesize({
            referenceAudioPath: sampleAudio,
            voiceName: 'Master Speaker Gold',
            text: 'សំឡេងក្លូនរបស់ខ្ញុំដំណើរការបានយ៉ាងល្អ',
            lang: 'km'
        });
        const voices = VoiceManager.getAllVoices();
        const hasClonedInList = (voices.km || []).some(v => v.name.includes('Master Speaker Gold'));
        assertTest('Voice Cloning & Auto-Populate', cloneRes.success === true && hasClonedInList, `(Cloned ID: ${cloneRes.voiceId})`);
    } catch (e) {
        assertTest('Voice Cloning & Auto-Populate', false, e.message);
    }

    console.log('\n========================================================================');
    console.log(`🏁 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('========================================================================\n');
}

runFullComprehensiveTests();
