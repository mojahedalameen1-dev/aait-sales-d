const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/clients', require('./routes/clients'));
app.use('/api/files', require('./routes/files'));
app.use('/api/analyze-idea', require('./routes/analyze'));
app.use('/api/meeting-preps', require('./routes/meetingPreps'));
app.use('/api/analyze-prep', require('./routes/analyzePrep'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`✅ Sales Focus Server running on http://localhost:${PORT}`);
});
