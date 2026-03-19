const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sales-focus-secret-123';

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
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
