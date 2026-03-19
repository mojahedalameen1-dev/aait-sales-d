const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sales-focus-secret-123';

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  // 1. Check Authorization Header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } 
  
  // 2. Fallback to Query String (?token=...)
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  // Debug logging for troubleshooting 401/403 issues
  if (!token) {
    console.log(`[Auth] No token found for ${req.method} ${req.originalUrl || req.url}`);
    console.log(`[Auth] Headers: ${JSON.stringify(req.headers)}`);
    if (req.query) console.log(`[Auth] Query: ${JSON.stringify(req.query)}`);
  }

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error(`[Auth] JWT Verification Failed: ${err.message}`);
        return res.sendStatus(403);
      }


      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

module.exports = { authenticateJWT, requireAdmin, JWT_SECRET };
