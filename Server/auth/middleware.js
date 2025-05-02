// Authentication middleware to verify JWT tokens
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'quotation_secret_key';

const authMiddleware = (req, res, next) => {
  // Get token from the Authorization header
  const authHeader = req.headers.authorization;

  // Check if auth header exists
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Check if auth header has the right format
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid token format.' });
  }

  const token = tokenParts[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user info to request object
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Admin role middleware
const adminMiddleware = (req, res, next) => {
  // Check if user exists in request (set by authMiddleware)
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware
};