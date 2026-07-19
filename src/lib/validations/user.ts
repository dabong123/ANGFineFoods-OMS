import { z } from "zod";

const roleEnum = z.enum(["OWNER", "SALES_AGENT", "ACCOUNTING"]);

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleEnum,
});

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: roleEnum,
  isActive: z.boolean(),
  // Only set when resetting the password — leave blank to keep it unchanged.
  password: z.union([z.string().min(8, "Password must be at least 8 characters"), z.literal("")]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
