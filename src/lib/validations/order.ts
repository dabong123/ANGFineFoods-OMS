import { z } from "zod";

export const orderLineInputSchema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    isWeightEstimated: z.boolean().optional(),
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

// For orders already approved (or partially delivered): lines that already
// shipped are locked and never appear here, so each submitted line is either
// an edit to an existing unshipped line (lineId set) or a brand-new one.
export const approvedOrderLineInputSchema = z
  .object({
    lineId: z.string().optional(),
    productId: z.string().min(1, "Product is required"),
    quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    fulfillmentSource: z.enum(["STORAGE", "SUPPLIER"]),
    supplierId: z.string().optional(),
    unitPriceOverride: z.coerce.number().nonnegative().optional(),
  })
  .refine((line) => line.fulfillmentSource !== "SUPPLIER" || !!line.supplierId, {
    message: "Supplier is required for supplier-fulfilled lines",
    path: ["supplierId"],
  });

export const updateApprovedOrderSchema = z.object({
  orderId: z.string().min(1),
  notes: z.string().max(2000).optional(),
  // No minimum: every remaining line could already be locked (delivered, or
  // a received supplier line), leaving nothing left to submit but notes.
  lines: z.array(approvedOrderLineInputSchema),
});

export type OrderLineInput = z.infer<typeof orderLineInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type ApprovedOrderLineInput = z.infer<typeof approvedOrderLineInputSchema>;
export type UpdateApprovedOrderInput = z.infer<typeof updateApprovedOrderSchema>;
