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
let server;
let io;

try {
  server = require('http').createServer(app);
  // We only initialize Socket.io if not on Vercel, or we handle it gracefully.
  // Vercel doesn't support WebSockets, so we provide a mock or skip to avoid crashes.
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Attach IO to app for route access
  app.set('io', io);

  // WebSocket connection handling
  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined room`);
    });
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected');
    });
  });
} catch (err) {
  console.warn('⚠️ Socket.io initialization failed or skipped:', err.message);
}

const PORT = process.env.PORT || 5000;

// Validate required environment variables
const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_USER', 'ADMIN_PASS'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.warn(`⚠️ Warning: Missing environment variables: ${missingEnv.join(', ')}`);
} else {
  console.log('✅ All required environment variables are present.');
}

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs for auth
  message: { error: 'Too many login attempts, please try again after 15 minutes' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

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

// Apply limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/', apiLimiter);

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

// app.use('/uploads', express.static(uploadsDir)); 
// Client uploads are served via authenticated /api/files/download/:fileId route for security

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Sales Focus API'
  });
});


if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`✅ تطوير الأعمال Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
