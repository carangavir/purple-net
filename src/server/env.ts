import "server-only";
import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url().refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), "DATABASE_URL must be a PostgreSQL URL"),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(16, "ADMIN_PASSWORD must be at least 16 characters"),
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Environment = z.infer<typeof environmentSchema>;

export function getEnv(): Environment {
  const result = environmentSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid server environment: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  }
  return result.data;
}
