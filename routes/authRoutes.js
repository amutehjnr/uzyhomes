// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateUserRegistration, validateLogin, handleValidationErrors } = require('../middleware/auth');

// Regular auth routes
router.post('/register', validateUserRegistration, handleValidationErrors, authController.register);
router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', authenticateToken, authController.getCurrentUser);

// ============ SOCIAL LOGIN ROUTES ============

// Google OAuth
router.get('/google', (req, res) => {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${process.env.BASE_URL}/api/auth/google/callback&` +
        `response_type=code&` +
        `scope=email%20profile&` +
        `access_type=offline&` +
        `prompt=consent`;
    
    res.redirect(googleAuthUrl);
});

router.get('/google/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.redirect('/login?error=google_auth_failed');
    }
    
    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `${process.env.BASE_URL}/api/auth/google/callback`,
                grant_type: 'authorization_code'
            })
        });
        
        const tokenData = await tokenResponse.json();
        
        // Get user info from Google
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });
        
        const userData = await userResponse.json();
        
        // Find or create user
        let user = await User.findOne({ email: userData.email });
        
        if (!user) {
            // Create new user from Google data
            user = new User({
                firstName: userData.given_name || userData.name.split(' ')[0],
                lastName: userData.family_name || userData.name.split(' ')[1] || '',
                email: userData.email,
                password: crypto.randomBytes(20).toString('hex'),
                googleId: userData.id,
                avatar: userData.picture,
                accountStatus: 'active',
                lastLogin: new Date()
            });
            
            await user.save();
        } else {
            // Update existing user
            user.googleId = userData.id;
            user.lastLogin = new Date();
            await user.save();
        }
        
        // Generate tokens
        const token = authController.generateToken(user._id);
        const refreshToken = authController.generateRefreshToken(user._id);
        
        // Set cookies
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        res.cookie('isLoggedIn', 'true', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        // Redirect to home with success
        res.redirect('/?login=success');
        
    } catch (error) {
        console.error('Google OAuth error:', error);
        res.redirect('/login?error=google_auth_failed');
    }
});

// Facebook OAuth
router.get('/facebook', (req, res) => {
    const facebookAuthUrl = `https://www.facebook.com/v12.0/dialog/oauth?` +
        `client_id=${process.env.FACEBOOK_APP_ID}&` +
        `redirect_uri=${process.env.BASE_URL}/api/auth/facebook/callback&` +
        `scope=email,public_profile`;
    
    res.redirect(facebookAuthUrl);
});

router.get('/facebook/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.redirect('/login?error=facebook_auth_failed');
    }
    
    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://graph.facebook.com/v12.0/oauth/access_token', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            body: new URLSearchParams({
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: `${process.env.BASE_URL}/api/auth/facebook/callback`,
                code
            })
        });
        
        const tokenData = await tokenResponse.json();
        
        // Get user info from Facebook
        const userResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture&access_token=${tokenData.access_token}`);
        const userData = await userResponse.json();
        
        // Find or create user
        let user = await User.findOne({ email: userData.email });
        
        if (!user) {
            user = new User({
                firstName: userData.first_name || userData.name.split(' ')[0],
                lastName: userData.last_name || userData.name.split(' ')[1] || '',
                email: userData.email || `${userData.id}@facebook.com`,
                password: crypto.randomBytes(20).toString('hex'),
                facebookId: userData.id,
                avatar: userData.picture?.data?.url,
                accountStatus: 'active',
                lastLogin: new Date()
            });
            
            await user.save();
        } else {
            user.facebookId = userData.id;
            user.lastLogin = new Date();
            await user.save();
        }
        
        // Generate tokens
        const token = authController.generateToken(user._id);
        const refreshToken = authController.generateRefreshToken(user._id);
        
        // Set cookies
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        res.cookie('isLoggedIn', 'true', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        res.redirect('/?login=success');
        
    } catch (error) {
        console.error('Facebook OAuth error:', error);
        res.redirect('/login?error=facebook_auth_failed');
    }
});

module.exports = router;