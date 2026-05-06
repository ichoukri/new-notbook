import type z from "zod";
import type { userSchema } from "./validations";

export type TUser = z.infer<typeof userSchema>;
