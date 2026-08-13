/**
 * Legacy Supabase server client placeholder.
 * Database operations now use MongoDB Mongoose via lib/db/mongodb.ts.
 */
export function createServerClient() {
  throw new Error('Supabase client has been migrated to MongoDB. Use connectToDatabase() from lib/db/mongodb.ts.');
}
