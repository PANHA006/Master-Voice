const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const apiRoutes = require('./routes/index');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// API Routes
app.use('/api', apiRoutes);

// Fallback to index.html for root navigation
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
