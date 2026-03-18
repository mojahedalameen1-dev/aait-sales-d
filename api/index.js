module.exports = (req, res) => {
  if (req.url === '/api/health-test') {
    return res.json({ status: 'API Layer OK', env: process.env.NODE_ENV });
  }

  try {
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
