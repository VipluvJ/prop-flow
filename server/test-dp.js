// import "dotenv/config";
// import { neon } from "@neondatabase/serverless";

// const sql = neon(process.env.DATABASE_URL);

// try {
//   const result = await sql`SELECT 1 AS connected`;
//   console.log("Database connection successful:", result);
// } catch (error) {
//   console.error("Database connection failed:", error.message);
// }

// import "dotenv/config";
// import pg from "pg";

// const { Client } = pg;

// const client = new Client({
//   connectionString: process.env.DATABASE_URL,
// });

// try {
//   await client.connect();
//   console.log("PostgreSQL connection successful!");

//   const result = await client.query("SELECT 1 AS connected");
//   console.log(result.rows);
// } catch (error) {
//   console.error("POSTGRES ERROR:");
//   console.error(error);
// } finally {
//   await client.end().catch(() => {});
// }

import "dotenv/config";
import pg from "pg";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

try {
  await migrate(db, {
    migrationsFolder: "./drizzle",
  });

  console.log("Migrations applied successfully!");
} catch (error) {
  console.error("MIGRATION FAILED:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
