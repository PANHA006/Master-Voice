const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const googleTTS = require('google-tts-api');

async function testSampleRate() {
    const base64 = await googleTTS.getAudioBase64('សួស្តីបាទ ខ្ញុំជាសំឡេងប្រុស', { lang: 'km' });
    const tmpIn = path.join(__dirname, '../storage/outputs/sample-check.mp3');
    fs.writeFileSync(tmpIn, Buffer.from(base64, 'base64'));

    const probe = execSync(`ffprobe -v error -show_entries stream=sample_rate,channels -of default=noprint_wrappers=1:nokey=1 "${tmpIn}"`).toString().trim();
    console.log('Google TTS Sample Rate Info:\n' + probe);

    // Let's test pitch shift filter
    // Instead of hardcoding 44100, we use rubberband or asetrate=24000*0.75,atempo=1.33
    const sampleRate = parseInt(probe.split('\n')[0]) || 24000;
    console.log('Detected Sample Rate:', sampleRate);

    // Testing true male pitch shift
    const malePitch = 0.72; // deep male
    const maleOut = path.join(__dirname, '../storage/outputs/sample-male.mp3');
    const filterMale = `asetrate=${Math.round(sampleRate * malePitch)},atempo=${(1 / malePitch).toFixed(3)},bass=g=8:f=110,treble=g=-2`;
    
    execSync(`ffmpeg -y -i "${tmpIn}" -af "${filterMale}" "${maleOut}"`);
    console.log('Male voice generated successfully at:', maleOut);
}

testSampleRate().catch(console.error);
