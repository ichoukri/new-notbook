import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImage: z.string().url().nullable().optional(),
  roleId: z.string().nullable().optional(),
  tenantId: z.string().nullable().optional(),
});
