import 'dotenv/config';
import express from 'express';
import foodRoutes from './routes/food-routes.js';
import dayRoutes from  './routes/day-routes.js';
import summaryRoutes from './routes/summary-routes.js';
import expenseRoutes from './routes/expense-routes.js';
import { connectDB, isDbConnected } from './utils/db.js';
import { auth } from './middleware/auth.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth-routes.js';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.PORT || 3000);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://deluxe-sfogliatella-71fdc0.netlify.app",
]);

const allowedOriginPatterns = [
  /^https?:\/\/localhost:\d+$/i,
  /^https:\/\/.*\.onrender\.com$/i,
];

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

envAllowedOrigins.forEach((origin) => allowedOrigins.add(origin));

const isAllowedOrigin = (origin: string) =>
  allowedOrigins.has(origin) ||
  allowedOriginPatterns.some((pattern) => pattern.test(origin));

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, native apps) and 'null' origin (file://)
      if (!origin || origin === 'null') {
        return callback(null, true);
      }

      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      console.warn(`Blocked CORS origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  })
);

// Statement uploads are sent inline (CSV text / base64 PDF) and easily exceed the
// 100kb default, but only that route needs the headroom — everything else keeps
// the small limit so the large body is not a site-wide surface.
const statementJson = express.json({ limit: '25mb' });
const standardJson = express.json();

app.use((req, res, next) =>
  (req.path.startsWith('/expenses') ? statementJson : standardJson)(req, res, next)
);
app.use(cookieParser());
app.use('/auth', authRoutes);
app.use('/foods', auth,  foodRoutes);
app.use('/days', auth,  dayRoutes);
app.use('/summary', auth,  summaryRoutes);
app.use('/expenses', auth, expenseRoutes);

app.get('/', (_req, res) => {
  res.send('Expense Tracker API running');
});

app.get('/health', (_req, res) => {
  const dbReady = isDbConnected();

  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'degraded',
    database: dbReady ? 'connected' : 'connecting',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// Listen first, connect in the background. A transient DNS or Atlas outage then
// degrades the service instead of killing the process and failing the deploy.
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

connectDB().catch((error: unknown) => {
  // Only reached for non-retryable config errors, e.g. a missing MONGO_URI.
  console.error(
    'Fatal database configuration error:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
