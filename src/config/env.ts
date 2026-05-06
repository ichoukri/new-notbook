import { z } from "zod";

const envSchema = z.object({
  VITE_NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  VITE_BACKEND_URL: z.string().url().default("http://localhost:8001/api/v1"),
  VITE_AUTH_FRONTEND_URL: z.string().url().default("http://localhost:8085"),
});

export const env = envSchema.parse(import.meta.env);
