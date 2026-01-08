import mongoose from 'mongoose';
import { getNextSequence } from '../utils/db.js';

const foodSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },

    name: { type: String, required: true, trim: true },

    packageCost: { type: Number, required: true, min: 0 },
    packageQuantity: { type: Number, required: true, min: 1 },

    unit: { type: String, enum: ['g', 'ml', 'pcs'], required: true },

    costPerUnit: { type: Number, required: true, min: 0 },

    isActive: { type: Boolean, default: true },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    }

  },
  { timestamps: true }
);


foodSchema.pre('save', async function () {
  if (this.isNew && this.id == null) {
    this.id = await getNextSequence('food');
  }
});


export const FoodModel = mongoose.model('Food', foodSchema);
export default FoodModel;
