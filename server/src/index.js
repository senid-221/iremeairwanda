require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const ConnectPgSimple = require('connect-pg-simple');
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const gameRoutes = require('./routes/game');
const healthRoutes = require('./routes/health');
const curriculumRoutes = require('./routes/curriculum');
const videoLessonRoutes = require('./routes/video-lessons');
const dashboardRoutes = require('./routes/dashboard');
const videoConfig = require('./config/video');
const videoWorker = require('./services/video/worker');
const schoolRoutes = require('./routes/schools');
const { configurePassport } = require('./config/passport');
const { SESSION_SECRET } = require('./config/secrets');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 10000;

const PgSession = ConnectPgSimple(session);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const rawOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? rawOrigins.filter(o => !o.includes('localhost'))
  : rawOrigins;
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for origin: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session_store',
    createTableIfMissing: true,
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
    path: '/',
  },
  name: 'ireme.sid',
}));

app.use(passport.initialize());
app.use(passport.session());

configurePassport(passport, prisma);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/video-lessons', videoLessonRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api', healthRoutes);

if (videoConfig.get().storage.mode === 'local') {
  app.use(videoConfig.get().storage.local.urlPrefix, express.static(videoConfig.get().storage.local.dir, {
    setHeaders: function (res, filePath) {
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Accept-Ranges', 'bytes');
      }
    },
  }));
  console.log(`Local video storage served at ${videoConfig.get().storage.local.urlPrefix}`);
}

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.message === 'CORS not allowed') {
    return res.status(403).json({ error: 'Not allowed by CORS' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    await pool.query('SELECT 1');
    console.log('Session store pool connected');

    videoWorker.start();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`IREME Backend running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  try {
    await prisma.$disconnect();
    await pool.end();
    console.log('Connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

module.exports = app;
