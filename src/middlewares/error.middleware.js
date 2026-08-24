// Global Error Handler Middleware
function errorHandler(err, req, res, next) {
    console.error('Server Error:', err);

    const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
}

// 404 Not Found Middleware
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        error: `Endpoint not found - ${req.originalUrl}`
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
