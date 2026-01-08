import mongoose from 'mongoose';

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not defined');
}

await mongoose.connect(process.env.MONGO_URI);

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGO_URI || '');
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
