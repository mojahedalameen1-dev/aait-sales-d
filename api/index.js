module.exports = (req, res) => {
  if (req.url === '/api/health-test') {
    const deps = ['express', 'cors', 'pg', 'bcryptjs', 'jsonwebtoken', 'multer'];
    const results = {};
    deps.forEach(d => {
      try { require(d); results[d] = 'OK'; }
      catch (e) { results[d] = 'ERROR: ' + e.message; }
    });
    return res.json({ status: 'API Layer OK', env: process.env.NODE_ENV, dependencies: results });
  }

  try {
    // Try to require the server module
    const app = require('../server/index');
    return app(req, res);
  } catch (err) {
    console.error('SERVER_LOAD_ERROR:', err);
    res.status(500).json({ 
      error: 'Failed to load server module',
      message: err.message,
      stack: err.stack,
      hint: 'Check if all dependencies are in the root package.json and redeployed on Vercel.'
    });
  }
};
