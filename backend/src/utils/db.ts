import mongoose from 'mongoose';

const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected — mongoose will reconnect automatically');
});

// Without a listener, a connection-level error is an unhandled 'error' event,
// which takes the whole process down.
mongoose.connection.on('error', (error: Error) => {
  console.error('MongoDB connection error:', error.message);
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let connecting: Promise<void> | null = null;

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

async function connectWithRetry(uri: string): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
      return;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const delay = Math.min(
        INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1),
        MAX_RETRY_DELAY_MS
      );

      console.error(
        `MongoDB connection attempt ${attempt} failed (${reason}). Retrying in ${delay / 1000}s`
      );
      await sleep(delay);
    }
  }
}

/**
 * Connects to MongoDB, retrying with exponential backoff instead of throwing.
 *
 * The caller is expected to start listening without awaiting this: a transient
 * DNS or Atlas hiccup should not fail an entire deploy. Mongoose buffers queries
 * until the link is up, so requests that arrive early wait rather than fail.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    // A missing URI is a config error, not a transient one — retrying is pointless.
    throw new Error('MONGO_URI is not defined');
  }

  if (isDbConnected()) return;
  if (connecting) return connecting;

  connecting = connectWithRetry(uri).finally(() => {
    connecting = null;
  });

  return connecting;
}

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

export async function getNextSequence(name: string) {
  const ret = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).exec();
  return ret.seq as number;
}
