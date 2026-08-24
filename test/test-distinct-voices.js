const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const PRESETS = {
    'km-KH-PisethNeural': 'asetrate=18000,atempo=1.3333333333333333,equalizer=f=120:width_type=o:width=1.2:g=6,equalizer=f=2800:width_type=o:width=1.0:g=2,volume=1.3',
    'km-pros': 'asetrate=17280,atempo=1.3888888888888888,equalizer=f=100:width_type=o:width=1.2:g=7,equalizer=f=3000:width_type=o:width=1.0:g=2,volume=1.35',
    'km-KH-SreymomNeural': 'asetrate=27600,atempo=0.8695652173913043,equalizer=f=3500:width_type=o:width=1.2:g=4.5,volume=1.2',
    'km-srey': 'asetrate=28800,atempo=0.8333333333333334,equalizer=f=3200:width_type=o:width=1.2:g=5.0,volume=1.2',
    'km-news': 'asetrate=20400,atempo=1.1764705882352942,equalizer=f=2500:width_type=o:width=1.0:g=4,compand=0.01|0.04:6:-60/-60|-20/-16|0/-2:6:0:-90:0.05,volume=1.3',
    'km-story': 'asetrate=19200,atempo=1.25,equalizer=f=140:width_type=o:width=1.2:g=4,aecho=0.8:0.88:30:0.15,volume=1.25'
};

async function testTransform() {
    const outputs = fs.readdirSync('storage/outputs').filter(f => f.endsWith('.mp3') && !f.startsWith('raw-') && !f.startsWith('test-'));
    const input = path.join('storage/outputs', outputs[0]);
    console.log('Testing input:', input, 'original size:', fs.statSync(input).size);

    for (const [v, filter] of Object.entries(PRESETS)) {
        const out = path.join('storage/outputs', `test-out-${v}.mp3`);
        await new Promise((res) => {
            execFile('ffmpeg', ['-y', '-i', input, '-af', filter, out], (err) => {
                if (err) console.error(`Error on ${v}:`, err.message);
                else console.log(`✅ Success for ${v}: output size = ${fs.statSync(out).size} bytes`);
                res();
            });
        });
    }
}

testTransform();
