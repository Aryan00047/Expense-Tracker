import mongoose, { HydratedDocument } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * User fields
 */
// export interface IUser {
//   name: string;
//   email: string;
//   password: string;
//   monthlyBudget?: number;
//   age?: number;
//   phone?: string;
// }

export interface IUser {
  name: string;
  email: string;

  // auth
  password?: string;          // ⬅️ make optional
  provider: 'local' | 'google';
  googleId?: string;

  // profile
  monthlyBudget?: number;
  age?: number;
  phone?: string;
}

/**
 * User instance methods
 */
export interface IUserMethods {
  comparePassword(password: string): Promise<boolean>;
}

/**
 * Final document type
 */
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

// const userSchema = new mongoose.Schema<IUser, {}, IUserMethods>(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       index: true,
//     },

//     password: {
//       type: String,
//       required: true,
//       select: false,
//     },

//     monthlyBudget: {
//       type: Number,
//       default: null,
//       min: 0,
//     },

//     age: {
//       type: Number,
//       default: null,
//       min: 1,
//     },

//     phone: {
//       type: String,
//       default: null,
//     },
//   },
//   { timestamps: true }
// );

const userSchema = new mongoose.Schema<IUser, {}, IUserMethods>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ['local', 'google'],
      required: true,
      default: 'local',
    },

    googleId: {
      type: String,
      index: true,
      sparse: true, // important
    },

    password: {
      type: String,
      required: function () {
        return this.provider === 'local';
      },
      select: false,
    },

    monthlyBudget: {
      type: Number,
      default: null,
      min: 0,
    },

    age: {
      type: Number,
      default: null,
      min: 1,
    },

    phone: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// 🔐 hash password
userSchema.pre('save', async function () {
  if (this.provider !== 'local') return;
  if (!this.isModified('password')) return;
  if (!this.password) return;

  this.password = await bcrypt.hash(this.password, 10);
});


// 🔐 instance method
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  if (this.provider !== 'local' || !this.password) {
    return false;
  }
  return bcrypt.compare(password, this.password);
};

export const UserModel = mongoose.model<IUser, mongoose.Model<IUser, {}, IUserMethods>>(
  'User',
  userSchema
);

export default UserModel;
