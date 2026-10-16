import { Pool, type QueryResultRow } from "pg";

// Read-only connection to the Postgres DB owned/migrated by management-api.
// Use a dedicated read-only DB role in production; this pool never writes.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
