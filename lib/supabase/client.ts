/**
 * Legacy Supabase client placeholder.
 * Database operations now use MongoDB Mongoose via lib/db/mongodb.ts.
 */
export function createClient() {
  throw new Error('Supabase client has been migrated to MongoDB. Use MongoDB API endpoints.');
}
