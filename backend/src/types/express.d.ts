import { IUser } from '../models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        monthlyBudget: number;
      };
    }
  }
}
