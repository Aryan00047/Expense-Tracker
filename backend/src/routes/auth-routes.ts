import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import UserModel from '../models/user.model.js';
import { PasswordResetModel } from '../models/password-reset.model.js';
import { RefreshTokenModel } from '../models/refresh-token.model.js';
import { auth } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import { OAuth2Client } from 'google-auth-library';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * REGISTER
 */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email and password are required',
    });
  }

  const exists = await UserModel.findOne({ email });
  if (exists) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered',
    });
  }

  await UserModel.create({
    name,
    email,
    password,
    provider: 'local',
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
  });
});


router.patch('/me', auth, async (req, res) => {
  const { name, monthlyBudget, age, phone } = req.body;

  if (
    monthlyBudget !== undefined &&
    (!Number.isFinite(monthlyBudget) || monthlyBudget < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: 'monthlyBudget must be a positive number',
    });
  }

  const user = await UserModel.findByIdAndUpdate(
    req.user!.id,
    {
      ...(name !== undefined && { name }),
      ...(monthlyBudget !== undefined && { monthlyBudget }),
      ...(age !== undefined && { age }),
      ...(phone !== undefined && { phone }),
    },
    { new: true }
  ).lean();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      name: user?.name,
      email: user?.email,
      monthlyBudget: user?.monthlyBudget,
      age: user?.age,
      phone: user?.phone,
    },
  });
});

router.get('/me', auth, async (req, res) => {
  const user = await UserModel.findById(req.user!.id).lean();

  res.json({
    success: true,
    data: {
      id: user?._id.toString(),
      name: user?.name,
      email: user?.email,
      monthlyBudget: user?.monthlyBudget,
      age: user?.age,
      phone: user?.phone,
    },
  });
});


/**
 * LOGIN (access + refresh)
 */
router.post('/login', async (req, res) => {
  const { email, rememberMe, password } = req.body;

  const user = await UserModel.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  const refreshTTL = rememberMe
  ? 30 * 24 * 60 * 60 * 1000  // 30 days
  : 24 * 60 * 60 * 1000;     // 1 day (or session)

  const accessToken = jwt.sign(
    { userId: user._id },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = crypto.randomUUID();

  await RefreshTokenModel.create({
    userId: user._id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + refreshTTL),
  });

  res
  .cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth/refresh',
    maxAge: refreshTTL,
  })
  .json({
    success: true,
    accessToken,
  });

});

/**
 * REFRESH TOKEN
 */
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token' });
  }

  const stored = await RefreshTokenModel.findOne({ token: refreshToken });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  const accessToken = jwt.sign(
    { userId: stored.userId },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({ accessToken });
});


/**
 * LOGOUT (invalidate refresh tokens)
 */
router.post('/logout', auth, async (req, res) => {
  await RefreshTokenModel.deleteMany({ userId: req.user!.id });

  res
    .clearCookie('refreshToken', { path: '/auth/refresh' })
    .json({ success: true });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required',
    });
  }

  const user = await UserModel.findOne({ email });
  if (!user) {
    // 🔐 do not leak user existence
    return res.json({ success: true });
  }

  const rawToken = crypto.randomUUID();
  const tokenHash = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  await PasswordResetModel.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  await sendPasswordResetEmail(user.email, rawToken);
  return res.json({
    success: true,
    message: 'Password reset email sent',
  });
});

/**
 * RESET PASSWORD
 */
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const record = await PasswordResetModel.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    return res.status(400).json({
      message: 'Invalid or expired token',
    });
  }

  const user = await UserModel.findById(record.userId);
  if (!user) {
    return res.status(400).json({ message: 'Invalid user' });
  }

  user.password = newPassword;
  await user.save();

  await PasswordResetModel.deleteMany({ userId: user._id });

  res.json({ success: true });
});

router.post("/validate-reset-token", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token required" });
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const record = await PasswordResetModel.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  res.json({ success: true });
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  try {
    const { idToken, rememberMe } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'idToken required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID not set in backend env');
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const { email, name, sub: googleId } = payload;

    let user = await UserModel.findOne({ email });

    // Block Google login if email/password account exists
    if (user && user.provider === 'local') {
      return res.status(409).json({
        message: 'Account exists with email/password login',
      });
    }

    if (!user) {
      user = await UserModel.create({
        name: name || email.split('@')[0],
        email,
        googleId,
        provider: 'google',
      });
    }

    const refreshTTL = rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const accessToken = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomUUID();

    await RefreshTokenModel.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + refreshTTL),
    });

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth/refresh',
        maxAge: refreshTTL,
      })
      .json({
        success: true,
        accessToken,
      });
  } catch (err) {
    console.error('GOOGLE AUTH ERROR:', err);
    res.status(500).json({ message: 'Google authentication failed' });
  }
});



export default router;
