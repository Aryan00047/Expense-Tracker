import { Router } from 'express';
import { DayModel } from '../models/day.model.js';
import { isValidDDMMYYYY, parseDDMMYYYY } from '../utils/date.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { type, from, to } = req.query as {
      type?: string;
      from?: string;
      to?: string;
    };

    // 🔹 optional daily budget
    const dailyBudget =
      req.query.dailyBudget !== undefined
        ? Number(req.query.dailyBudget)
        : undefined;

    if (
      dailyBudget !== undefined &&
      (!Number.isFinite(dailyBudget) || dailyBudget <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'dailyBudget must be a positive number',
      });
    }

    let start: Date;
    let end: Date;

    // ✅ Custom range
    if (from && to) {
      if (!isValidDDMMYYYY(from) || !isValidDDMMYYYY(to)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format (ddmmyyyy)',
        });
      }

      start = parseDDMMYYYY(from);
      end = parseDDMMYYYY(to);
    } else {
      // ✅ Preset ranges
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (type) {
        case 'weekly':
          end = new Date(today);
          start = new Date(today);
          start.setDate(end.getDate() - 6);
          break;

        case 'monthly':
          end = new Date(today);
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          break;

        case 'quarterly': {
          const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
          start = new Date(today.getFullYear(), qStartMonth, 1);
          end = new Date(today);
          break;
        }

        case 'halfyear':
          start = new Date(today);
          start.setMonth(start.getMonth() - 5);
          end = new Date(today);
          break;

        case 'yearly':
          start = new Date(today.getFullYear(), 0, 1);
          end = new Date(today);
          break;

        default:
          return res.status(400).json({
            success: false,
            message:
              'Invalid type. Use weekly | monthly | quarterly | halfyear | yearly',
          });
      }
    }

    // 🔐 USER-SCOPED QUERY (CRITICAL)
    const days = await DayModel.find({
      userId: req.user!.id,
      dateISO: { $gte: start, $lte: end },
    })
      .sort({ dateISO: 1 })
      .lean();

    const totalCost = days.reduce((s, d) => s + d.totalCost, 0);
    const daysCount = days.length;

    // 🔹 Budget computation
    let budget = null;

    if (dailyBudget !== undefined && daysCount > 0) {
      const totalBudget = Number((dailyBudget * daysCount).toFixed(2));
      const exceededBy = Number(
        Math.max(0, totalCost - totalBudget).toFixed(2)
      );

      budget = {
        dailyBudget,
        totalBudget,
        isExceeded: totalCost > totalBudget,
        exceededBy,
        remainingBudget:
          exceededBy === 0
            ? Number((totalBudget - totalCost).toFixed(2))
            : 0,
      };
    }

    return res.json({
      success: true,
      range: {
        from: formatDDMMYYYY(start),
        to: formatDDMMYYYY(end),
      },
      daysCount,
      totalCost,
      averagePerDay: daysCount
        ? Number((totalCost / daysCount).toFixed(2))
        : 0,
      budget,
      breakdown: days.map(d => ({
        date: d.date,
        totalCost: d.totalCost,
      })),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate summary',
    });
  }
});

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

export default router;
