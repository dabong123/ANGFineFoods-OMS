import { z } from "zod";

export const orderLineInputSchema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    fulfillmentSource: z.enum(["STORAGE", "SUPPLIER"]),
    supplierId: z.string().optional(),
    // Only honored server-side when the actor has pricing:edit permission.
    unitPriceOverride: z.coerce.number().nonnegative().optional(),
  })
  .refine((line) => line.fulfillmentSource !== "SUPPLIER" || !!line.supplierId, {
    message: "Supplier is required for supplier-fulfilled lines",
    path: ["supplierId"],
  });

export const createOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  notes: z.string().max(2000).optional(),
  lines: z.array(orderLineInputSchema).min(1, "Add at least one line item"),
});

export const updateOrderSchema = createOrderSchema.extend({
  orderId: z.string().min(1),
});

export type OrderLineInput = z.infer<typeof orderLineInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
