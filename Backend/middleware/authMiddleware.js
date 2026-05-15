// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// middleware/authMiddleware.js - Add these logs
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token, authorization denied'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('🔐 [AUTH] Decoded token:', decoded);

        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid'
            });
        }

        console.log('👤 [AUTH] User found:', {
            id: user._id,
            email: user.email,
            role: user.role,
            companyId: user.companyId  // ← Check if this exists
        });

        // Attach user to request
        req.user = {
            id: user._id,
            _id: user._id,
            email: user.email,
            role: user.role,
            companyId: user.companyId,  // ← Make sure this is set
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            permissions: user.permissions || []
        };

        console.log('✅ [AUTH] req.user set:', {
            id: req.user.id,
            companyId: req.user.companyId,
            role: req.user.role
        });

        next();
    } catch (error) {
        console.error('❌ [AUTH] Error:', error);
        res.status(401).json({
            success: false,
            message: 'Token is not valid'
        });
    }
};

module.exports = authMiddleware;