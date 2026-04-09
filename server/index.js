const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
fs.mkdirSync(uploadsDir, { recursive: true });

const corsOptions = {
  origin(origin, callback) {
    const isLocal = !origin || 
                   origin.startsWith('http://localhost') || 
                   origin.startsWith('http://127.0.0.1') ||
                   origin.startsWith('http://192.168.') ||
                   origin.startsWith('http://172.') ||
                   origin.startsWith('http://10.');

    if (isLocal || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};

const io = new Server(server, {
  cors: corsOptions,
});

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// Rate limit all auth requests
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { msg: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);

app.use('/uploads', express.static(uploadsDir));

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/users', require('./routes/users'));
app.use('/api/financialYears', require('./routes/financialYears'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/mail', require('./routes/mail'));

// Expose io to routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('Mediclaim API is running');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local Access: http://localhost:${PORT}`);
});
