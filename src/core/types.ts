import type z from "zod";
import type { signinSchema, signupSchema, userSchema } from "./validations";

export type TUser = z.infer<typeof userSchema>;

export type TSignupInput = z.input<typeof signupSchema>;
export type TSigninInput = z.input<typeof signinSchema>;

export type TBackendUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_image?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TBackendTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type TAuthSession = {
  user: TUser;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
};

export type TSignupResponse = TUser;
export type TSigninResponse = TAuthSession;
