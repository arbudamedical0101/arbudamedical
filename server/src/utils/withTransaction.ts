import mongoose, { ClientSession } from 'mongoose';
import { supportsTransactions } from '../config/db';

/**
 * Runs `work` inside a MongoDB transaction when the deployment supports it
 * (replica set / sharded). Falls back to running without a session on
 * standalone deployments so the app still works in dev — but billing/GRN
 * code should be deployed against a replica set for true atomicity.
 */
export async function withTransaction<T>(
  work: (session: ClientSession | undefined) => Promise<T>
): Promise<T> {
  if (!supportsTransactions()) {
    return work(undefined);
  }

  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
