import mongoose from 'mongoose';

const resetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // 🔥 auto cleanup
    },
  },
  { timestamps: true }
);

export const PasswordResetModel = mongoose.model(
  'PasswordReset',
  resetSchema
);
