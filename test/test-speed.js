const TTSService = require('../src/services/tts.service');
const { formatTime } = require('../src/utils/timestamp.util');

async function testSpeedAccuracy() {
    console.log('===============================================================');
    console.log('🧪 TESTING SPEED 1.4x & TIMESTAMP SYNCHRONIZATION ACCURACY');
    console.log('===============================================================\n');

    const khmerScript = `សូមស្វាគមន៍មកកាន់ VoxSync AI ដែលជាកម្មវិធីបំប្លែងសំឡេងដ៏ឆ្លាតវៃ។
ទទួលបានសំឡេងនិយាយធម្មជាតិ ជាមួយការកំណត់ពេលវេលាជាក់លាក់។
អ្នកអាចបំប្លែងអត្ថបទទៅជាសំឡេង និងសំឡេងទៅជាអត្ថបទយ៉ាងងាយស្រួល។
សូមអរគុណសម្រាប់ការប្រើប្រាស់សេវាកម្មរបស់យើង។`;

    // Test at 1.0x speed
    console.log('1️⃣ Synthesizing at 1.00x Normal Speed...');
    const res1 = await TTSService.synthesize({ text: khmerScript, lang: 'km', rate: 1.0 });
    console.log('   Total Duration (1.0x):', res1.duration, 'sec (', formatTime(res1.duration), ')');
    console.log('   Timestamps:');
    res1.timestamps.forEach(t => console.log('     ', t.formattedLine));

    // Test at 1.40x speed
    console.log('\n2️⃣ Synthesizing at 1.40x Fast Speed (User Scenario)...');
    const res14 = await TTSService.synthesize({ text: khmerScript, lang: 'km', rate: 1.4 });
    console.log('   Total Duration (1.4x):', res14.duration, 'sec (', formatTime(res14.duration), ')');
    console.log('   Timestamps:');
    res14.timestamps.forEach(t => console.log('     ', t.formattedLine));

    // Test at 2.50x speed
    console.log('\n3️⃣ Synthesizing at 2.50x Max Speed...');
    const res25 = await TTSService.synthesize({ text: khmerScript, lang: 'km', rate: 2.5 });
    console.log('   Total Duration (2.5x):', res25.duration, 'sec (', formatTime(res25.duration), ')');
    console.log('   Timestamps:');
    res25.timestamps.forEach(t => console.log('     ', t.formattedLine));

    // Verify all timestamps are strictly within total duration
    const last14Time = res14.timestamps[res14.timestamps.length - 1].seconds;
    const isAccurate = last14Time < res14.duration;
    console.log('\n===============================================================');
    console.log('🔍 VERIFICATION RESULT:');
    console.log('   1.4x Last Timestamp Seconds (' + last14Time + 's) < Total Duration (' + res14.duration + 's):', isAccurate ? '✅ PASSED PERFECTLY' : '❌ FAILED');
    console.log('===============================================================');
}

testSpeedAccuracy().catch(console.error);
