import mongoose from 'mongoose';
import { getTodayDDMMYYYY, parseDDMMYYYY } from '../utils/date.js';

const daySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      unique: true,
      index: true,
      default: getTodayDDMMYYYY,
    },

    // 🔑 REQUIRED for summaries
    dateISO: {
      type: Date,
      required: true,
      index: true,
    },

    items: [
      {
        foodId: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        cost: { type: Number, required: true, min: 0 },
      },
    ],

    extraCost: { type: Number, default: 0, min: 0 },

    totalCost: { type: Number, required: true, min: 0 },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    }
  },
  { timestamps: true }
);

// ✅ Always derive dateISO from date
daySchema.pre('validate', function () {
  if (!this.dateISO && this.date) {
    this.dateISO = parseDDMMYYYY(this.date);
  }
});

export const DayModel = mongoose.model('DayLog', daySchema);
export default DayModel;
