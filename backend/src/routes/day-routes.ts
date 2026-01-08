import { Router, Request, Response } from 'express';
import { DayModel } from '../models/day.model.js';
import { FoodModel } from '../models/food.model.js';
import { getTodayDDMMYYYY, isValidDDMMYYYY, parseDDMMYYYY } from '../utils/date.js';
import { DayItem, DayLog } from '../models/day.js';

const router = Router();

interface CreateDayRequest {
  date?: string;
  items: Omit<DayItem, 'cost'>[];
  extraCost?: number;
}

/**
 * CREATE / OVERWRITE day (user scoped)
 */
router.post(
  '/',
  async (req: Request<{}, {}, CreateDayRequest>, res: Response) => {
    try {
      let { date, items, extraCost = 0 } = req.body;
      date = date || getTodayDDMMYYYY();

      if (!isValidDDMMYYYY(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format (ddmmyyyy)',
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'items must be a non-empty array',
        });
      }

      const foodIds = items.map(i => i.foodId);

      // 🔐 FOOD MUST BELONG TO USER
      const foods = await FoodModel.find({
        id: { $in: foodIds },
        userId: req.user!.id,
        isActive: true,
      }).lean();

      if (foods.length !== foodIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more foods are invalid',
        });
      }

      const foodMap = new Map(foods.map(f => [f.id, f]));

      const computedItems = items.map(item => {
        const food = foodMap.get(item.foodId)!;
        return {
          foodId: item.foodId,
          quantity: item.quantity,
          cost: Number((food.costPerUnit * item.quantity).toFixed(2)),
        };
      });

      const foodCost = computedItems.reduce((s, i) => s + i.cost, 0);
      const totalCost = Number((foodCost + extraCost).toFixed(2));

      const doc = await DayModel.findOneAndUpdate(
        {
          date,
          userId: req.user!.id, // 🔐 ownership enforced
        },
        {
          userId: req.user!.id,
          date,
          dateISO: parseDDMMYYYY(date),
          items: computedItems,
          extraCost,
          totalCost,
        },
        { upsert: true, new: true }
      );

      return res.status(201).json({
        success: true,
        message: 'Day saved successfully',
        data: doc,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to save day',
      });
    }
  }
);

/**
 * READ all days (only user’s days)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const logs = await DayModel.find({ userId: req.user!.id })
      .sort({ date: -1 })
      .lean<DayLog[]>();

    return res.json({
      success: true,
      message: 'Days fetched successfully',
      data: logs,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch days',
    });
  }
});

/**
 * READ one day (only user’s day)
 */
router.get('/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;

    if (!isValidDDMMYYYY(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date',
      });
    }

    const log = await DayModel.findOne({
      date,
      userId: req.user!.id,
    }).lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Day not found',
      });
    }

    return res.json({
      success: true,
      message: 'Day fetched successfully',
      data: log,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch day',
    });
  }
});

/**
 * DELETE day (only user’s day)
 */
router.delete('/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;

    const result = await DayModel.deleteOne({
      date,
      userId: req.user!.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Day not found',
      });
    }

    return res.json({
      success: true,
      message: 'Day deleted successfully',
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete day',
    });
  }
});

export default router;
