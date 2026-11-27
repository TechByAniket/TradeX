import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Fallback lets `prisma generate` succeed during installs before runtime DATABASE_URL is injected
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/postgres",
  },
});