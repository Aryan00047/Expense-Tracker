import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import UserModel from '../models/user.model.js';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function auth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await UserModel.findById(payload.userId).lean();
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      monthlyBudget: user.monthlyBudget,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
}
