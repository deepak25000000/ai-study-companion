const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// ==================== REGISTER (Manual) ====================
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Check MongoDB connection first
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ Registration failed: MongoDB not connected (state:', mongoose.connection.readyState, ')');
            return res.status(503).json({ error: 'Database not connected. Please check server configuration.' });
        }

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Create user
        const user = new User({
            name,
            email: email.toLowerCase(),
            phone: phone || '',
            password,
            provider: 'manual'
        });

        await user.save();
        console.log(`✅ New user registered: ${email}`);

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                provider: user.provider
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
};

// ==================== LOGIN (Manual) ====================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check MongoDB connection first
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ Login failed: MongoDB not connected (state:', mongoose.connection.readyState, ')');
            return res.status(503).json({ error: 'Database not connected. Please check server configuration.' });
        }

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Check if user registered via Google only
        if (user.provider === 'google' && !user.password) {
            return res.status(401).json({ error: 'This account uses Google Sign-In. Please use the Google button.' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        console.log(`✅ User logged in: ${email}`);

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                provider: user.provider
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
};

// ==================== GOOGLE AUTH (Firebase) ====================
exports.googleAuth = async (req, res) => {
    try {
        const { idToken, name, email, photoURL, uid } = req.body;

        // Check MongoDB connection first
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ Google auth failed: MongoDB not connected (state:', mongoose.connection.readyState, ')');
            return res.status(503).json({ error: 'Database not connected. Please check server configuration.' });
        }

        if (!email || !uid) {
            return res.status(400).json({ error: 'Google authentication data is incomplete.' });
        }

        // Find or create user
        let user = await User.findOne({
            $or: [{ googleId: uid }, { email: email.toLowerCase() }]
        });

        if (user) {
            // Update Google info if needed
            if (!user.googleId) {
                user.googleId = uid;
                user.provider = 'google';
            }
            if (photoURL && !user.avatar) {
                user.avatar = photoURL;
            }
            if (name && !user.name) {
                user.name = name;
            }
            await user.save();
            console.log(`✅ Google user logged in: ${email}`);
        } else {
            // Create new user from Google
            user = new User({
                name: name || 'Google User',
                email: email.toLowerCase(),
                googleId: uid,
                avatar: photoURL || '',
                provider: 'google'
            });
            await user.save();
            console.log(`✅ New Google user created: ${email}`);
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                provider: user.provider
            }
        });

    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google authentication failed.' });
    }
};

// ==================== GET PROFILE ====================
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                provider: user.provider,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to load profile.' });
    }
};
