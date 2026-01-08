import { Router, Request, Response } from 'express';
import { FoodModel } from '../models/food.model.js';

const router = Router();

/**
 * CREATE food (user scoped)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, packageCost, packageQuantity, unit } = req.body;

    if (!name || !packageCost || !packageQuantity || !unit) {
      return res.status(400).json({
        success: false,
        message: 'name, packageCost, packageQuantity and unit are required',
      });
    }

    const costPerUnit = Number((packageCost / packageQuantity).toFixed(4));

    const food = await FoodModel.create({
      userId: req.user!.id, // 🔐 ownership enforced
      name,
      packageCost,
      packageQuantity,
      unit,
      costPerUnit,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Food created successfully',
      data: food,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create food',
    });
  }
});

/**
 * READ all foods (only user's foods)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const foods = await FoodModel.find(
      {
        userId: req.user!.id, // 🔐 isolation
        isActive: true,
      },
      { _id: 0, __v: 0 }
    ).lean();

    return res.json({
      success: true,
      message: 'Foods fetched successfully',
      data: foods,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch foods',
    });
  }
});

/**
 * UPDATE food (only owned food)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid food id',
      });
    }

    const food = await FoodModel.findOne({
      id,
      userId: req.user!.id, // 🔐 ownership check
      isActive: true,
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food not found',
      });
    }

    Object.assign(food, req.body);

    if (req.body.packageCost || req.body.packageQuantity) {
      food.costPerUnit = Number(
        (food.packageCost / food.packageQuantity).toFixed(4)
      );
    }

    await food.save();

    return res.json({
      success: true,
      message: 'Food updated successfully',
      data: food,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to update food',
    });
  }
});

/**
 * SOFT DELETE food (only owned food)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid food id',
      });
    }

    const result = await FoodModel.updateOne(
      {
        id,
        userId: req.user!.id, // 🔐 ownership check
        isActive: true,
      },
      { isActive: false }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Food not found',
      });
    }

    return res.json({
      success: true,
      message: 'Food deleted successfully',
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete food',
    });
  }
});

export default router;
