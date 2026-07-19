import serverless from 'serverless-http';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

let handler: ReturnType<typeof serverless>;

export default async function (req: any, res: any) {
  if (!handler) {
    await connectDB();
    const app = createApp();
    handler = serverless(app);
  }
  return handler(req, res);
}
