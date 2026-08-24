const app = require('./app');
const config = require('./config/config');
const { ensureDir } = require('./utils/audio.util');
const StorageCleanupService = require('./services/cleanup.service');

// Ensure necessary storage directories exist
ensureDir(config.uploadsDir);
ensureDir(config.outputsDir);

const server = app.listen(config.port, () => {
    console.log(`=============================================`);
    console.log(`🚀 VoxSync AI Server is running!`);
    console.log(`📍 URL: http://localhost:${config.port}`);
    console.log(`⚙️  Environment: ${config.nodeEnv}`);
    console.log(`=============================================`);

    // Start background storage cleanup scheduler
    StorageCleanupService.startScheduler();
});

// Handle graceful shutdown & prevent unhandled crashes
process.on('uncaughtException', (err) => {
    console.error('[Global UncaughtException]:', err.stack || err.message || err);
});

process.on('unhandledRejection', (reason) => {
    console.error('[Global UnhandledRejection]:', reason);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

module.exports = server;
