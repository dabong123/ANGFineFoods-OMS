import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  pricePerKg: z.coerce.number().positive("Price must be greater than 0"),
  trackInventory: z.boolean(),
  currentStock: z.coerce.number().nonnegative().optional(),
  isActive: z.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;
