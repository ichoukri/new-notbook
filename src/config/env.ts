import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}, z.boolean());

const envSchema = z.object({
  VITE_NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  VITE_BACKEND_URL: z.string().url().default("http://localhost:8001/api/v1"),
  VITE_AUTH_FRONTEND_URL: z.string().url().default("http://localhost:8085"),
  VITE_MAX_UPLOAD_MB: z.coerce.number().int().positive().default(1024),
  VITE_ENABLE_REACT_SCAN: booleanFromEnv.default(false),
});

export const env = envSchema.parse(import.meta.env);
