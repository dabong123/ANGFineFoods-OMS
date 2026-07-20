import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contactName: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email("Enter a valid email").max(200).optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  isActive: z.boolean(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
