// import { createApp } from './app';
// import { connectDB } from './config/db';
// import { env } from './config/env';
// import { User } from './models/User';
// import { seedData } from './seed/seed';

// async function bootstrap() {
//   await connectDB();

//   // Seed automatically only when the database has no users yet. This covers
//   // the in-memory DB (empty every run) and the first boot of a fresh Atlas
//   // DB — it creates the admin login and store settings (phone, map, etc.).
//   // Once users exist it is skipped, so persisted data / password changes are
//   // never wiped.
//   const hasUsers = await User.exists({});
//   if (!hasUsers) {
//     // eslint-disable-next-line no-console
//     console.log('[server] database is empty — seeding initial data...');
//     await seedData();
//   }

//   const app = createApp();
//   app.listen(env.port, () => {
//     // eslint-disable-next-line no-console
//     console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
//   });
// }

// bootstrap().catch((err) => {
//   // eslint-disable-next-line no-console
//   console.error('[server] failed to start', err);
//   process.exit(1);
// });
import serverless from "serverless-http";
import { createApp } from "../src/app";
import { connectDB } from "../src/config/db";

let handler: any;

export default async function (req: any, res: any) {
  if (!handler) {
    await connectDB();
    const app = createApp();
    handler = serverless(app);
  }

  return handler(req, res);
}