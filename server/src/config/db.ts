import mongoose from 'mongoose';
import { env } from './env';

let transactionsSupported = false;

export function supportsTransactions(): boolean {
  return transactionsSupported;
}

async function resolveUri(): Promise<string> {
  if (!env.useMemoryDb) return env.mongoUri;
  // Lazily start an in-memory replica set (transactions supported). The
  // package is a devDependency, so it is only required in this dev path.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri('pharmacy');
  // eslint-disable-next-line no-console
  console.log('[db] using in-memory MongoDB replica set');
  return uri;
}

export async function connectDB(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  const uri = await resolveUri();
  const conn = await mongoose.connect(uri);

  // Detect whether the deployment is a replica set / mongos (required for
  // multi-document transactions). We never want billing to silently run
  // non-atomically, so we record this and surface it to callers.
  try {
    const admin = conn.connection.db?.admin();
    const info = await admin?.command({ hello: 1 });
    transactionsSupported = Boolean(info?.setName || info?.msg === 'isdbgrid');
  } catch {
    transactionsSupported = false;
  }

  // eslint-disable-next-line no-console
  console.log(
    `[db] connected to ${conn.connection.name} | transactions ${
      transactionsSupported ? 'ENABLED' : 'NOT available (run Mongo as a replica set)'
    }`
  );
  return conn;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
