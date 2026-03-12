import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("MONGODB_URI is not defined. Database features will be disabled.");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global cache to reuse connections across hot reloads in dev
const globalWithMongoose = global as typeof globalThis & { mongoose?: MongooseCache };
const cached: MongooseCache = globalWithMongoose.mongoose ?? { conn: null, promise: null };
if (!globalWithMongoose.mongoose) globalWithMongoose.mongoose = cached;

export async function connectDB(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) return null;
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
