const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables (only in non-production)
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = require('dotenv');
    dotenv.config(); // Loads from process.cwd()
    dotenv.config({ path: path.join(__dirname, '.env') }); // Loads from /server/.env
    dotenv.config({ path: path.join(__dirname, '..', '.env') }); // Loads from root/.env
  } catch (e) {
    console.warn('Dotenv loading skipped or failed:', e.message);
  }
}
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Server starting initialization...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Vercel environment: ${process.env.VERCEL === '1' ? 'Yes' : 'No'}`);

// Validate required environment variables
const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.warn(`⚠️ Warning: Missing environment variables: ${missingEnv.join(', ')}`);
} else {
  console.log('✅ All required environment variables are present.');
}

// Middleware
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/slack')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const isVercel = process.env.VERCEL === '1';
const uploadsDir = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory at: ${uploadsDir}`);
  }
} catch (err) {
  console.error(`Failed to create uploads directory: ${err.message}`);
}

app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/files', require('./routes/files'));
app.use('/api/analyze-idea', require('./routes/analyze'));
app.use('/api/meeting-preps', require('./routes/meetingPreps'));
app.use('/api/analyze-prep', require('./routes/analyzePrep'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/slack', require('./routes/slack'));

// Health-Check Endpoint (Self-Diagnostic System)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    isVercel: !!process.env.VERCEL,
    diagnostics: {
      neonDbConnected: !!process.env.DATABASE_URL
    }
  });
});


if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ تطوير الأعمال Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
