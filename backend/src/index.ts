import 'dotenv/config';
import express from 'express';
import foodRoutes from './routes/food-routes.js';
import dayRoutes from  './routes/day-routes.js';
import summaryRoutes from './routes/summary-routes.js';
import { connectDB } from './utils/db.js';
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

app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);
app.use('/foods', auth,  foodRoutes);
app.use('/days', auth,  dayRoutes);
app.use('/summary', auth,  summaryRoutes);

app.get('/', (_req, res) => {
  res.send('Expense Tracker API running');
});

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
