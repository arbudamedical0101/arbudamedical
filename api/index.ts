// Vercel serverless entry point — re-exports the Express app as a handler.
// Vercel looks for files in /api at the project root.
export { default } from '../server/src/index';
