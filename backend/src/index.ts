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
const PORT = 3000;

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));
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
