import mongoose from 'mongoose';

const expenseEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Credits are stored too, so the dashboard can show real cash flow rather
    // than assuming every stored row is an expense.
    direction: {
      type: String,
      enum: ['debit', 'credit'],
      default: 'debit',
      index: true,
    },
    flow: {
      type: String,
      enum: ['spend', 'transfer', 'investment', 'debt', 'income'],
      default: 'spend',
    },
    category: {
      type: String,
      default: 'Uncategorized',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    merchant: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      enum: ['csv', 'pdf'],
      default: 'csv',
    },
    importBatchId: {
      type: String,
      required: true,
      index: true,
    },
    rawDate: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

expenseEntrySchema.index({ userId: 1, occurredAt: -1 });

export const ExpenseEntryModel = mongoose.model(
  'ExpenseEntry',
  expenseEntrySchema
);

export default ExpenseEntryModel;
