/**
 * Legacy Supabase admin client placeholder.
 * Database operations now use MongoDB Mongoose via lib/db/mongodb.ts.
 */
export function createAdminClient() {
  throw new Error('Supabase client has been migrated to MongoDB. Use connectToDatabase() from lib/db/mongodb.ts.');
}
