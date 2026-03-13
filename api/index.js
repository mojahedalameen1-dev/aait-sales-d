try {
  const app = require('../server/index');
  module.exports = app;
} catch (err) {
  console.error('SERVER_LOAD_ERROR:', err);
  module.exports = (req, res) => {
    res.status(500).json({ 
      error: 'Failed to load server module',
      message: err.message,
      stack: err.stack
    });
  };
}
