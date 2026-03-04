const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'study-buddy-secret-key-2024';

// Required auth - blocks access if no valid token
const requireAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// Optional auth - attaches user if token exists, but doesn't block
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        }
    } catch (error) {
        // Token invalid, continue without user
    }
    next();
};

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
