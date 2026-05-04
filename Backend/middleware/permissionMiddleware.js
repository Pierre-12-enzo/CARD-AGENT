// middleware/permissionMiddleware.js
const checkPermission = (permission) => {
  return (req, res, next) => {
    // Super admin can do anything
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Staff check specific permission
    if (req.user.role === 'staff' && req.user.permissions?.[permission]) {
      return next();
    }
    
    return res.status(403).json({ 
      success: false, 
      error: 'You do not have permission to perform this action' 
    });
  };
};

module.exports = checkPermission;