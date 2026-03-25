import { neon } from '@neondatabase/serverless';

/**
 * Neon Database Client
 * Uses @neondatabase/serverless to work optimally in Vercel Serverless and Edge functions.
 * DATABASE_URL must be set in your Environment Variables.
 */
const sql = neon(process.env.DATABASE_URL!);

export default sql;
