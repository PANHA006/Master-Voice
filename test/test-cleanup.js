const fs = require('fs');
const path = require('path');
const config = require('../src/config/config');
const StorageCleanupService = require('../src/services/cleanup.service');

async function testCleanup() {
    console.log('🧪 Testing StorageCleanupService...');

    const testOldFile = path.join(config.outputsDir, `test-old-${Date.now()}.mp3`);
    const testNewFile = path.join(config.outputsDir, `test-new-${Date.now()}.mp3`);

    fs.writeFileSync(testOldFile, 'dummy old audio content');
    fs.writeFileSync(testNewFile, 'dummy new audio content');

    // Manually backdate testOldFile by 25 hours
    const pastTime = (Date.now() - (25 * 60 * 60 * 1000)) / 1000;
    fs.utimesSync(testOldFile, pastTime, pastTime);

    console.log('Created test files:');
    console.log('- Old file (25h ago):', path.basename(testOldFile));
    console.log('- New file (now):', path.basename(testNewFile));

    // Run cleanup with 24 hours maxAge
    const result = StorageCleanupService.runCleanup({ maxAgeHours: 24 });
    console.log('Cleanup result:', result);

    const oldExists = fs.existsSync(testOldFile);
    const newExists = fs.existsSync(testNewFile);

    console.log('Old file deleted?:', !oldExists ? '✅ YES (Success)' : '❌ NO (Failed)');
    console.log('New file preserved?:', newExists ? '✅ YES (Success)' : '❌ NO (Failed)');

    // Clean up testNewFile
    if (fs.existsSync(testNewFile)) {
        fs.unlinkSync(testNewFile);
    }

    if (!oldExists && newExists) {
        console.log('🎉 All Storage Cleanup tests passed successfully!');
    } else {
        console.error('⚠️ Cleanup test validation failed.');
        process.exit(1);
    }
}

testCleanup().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
