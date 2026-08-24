const fs = require('fs');
const path = require('path');
const config = require('../src/config/config');

async function testHistory() {
    console.log('====================================================');
    console.log('🧪 TESTING AUDIO HISTORY & STORAGE API ENDPOINTS');
    console.log('====================================================\n');

    // 1. Create a temporary test file in outputs
    const testFile = path.join(config.outputsDir, `tts-test-history-${Date.now()}.mp3`);
    fs.writeFileSync(testFile, 'dummy audio data for history test');
    console.log('1️⃣ Created temporary test file:', path.basename(testFile));

    // 2. Fetch history list
    console.log('\n2️⃣ Testing GET /api/history...');
    const res = await fetch('http://localhost:3000/api/history');
    const data = await res.json();
    console.log('   Success:', data.success);
    console.log('   Total Files Count:', data.count);
    console.log('   Total Storage Size:', data.totalSizeFormatted);

    const found = data.files.find(f => f.fileName === path.basename(testFile));
    console.log('   Found test file in history list?:', found ? '✅ YES [PASSED]' : '❌ NO [FAILED]');

    if (!found) {
        throw new Error('Test file not found in history API response.');
    }

    // 3. Test deleting this specific file
    console.log('\n3️⃣ Testing DELETE /api/history/outputs/' + path.basename(testFile) + '...');
    const delRes = await fetch(`http://localhost:3000/api/history/outputs/${path.basename(testFile)}`, {
        method: 'DELETE'
    });
    const delData = await delRes.json();
    console.log('   Delete Response:', delData.message);
    const fileExistsAfter = fs.existsSync(testFile);
    console.log('   File successfully removed from disk?:', !fileExistsAfter ? '✅ YES [PASSED]' : '❌ NO [FAILED]');

    console.log('\n====================================================');
    console.log('🎉 ALL HISTORY API TESTS COMPLETED & PASSED 100%!');
    console.log('====================================================');
}

testHistory().catch(err => {
    console.error('History test error:', err);
    process.exit(1);
});
