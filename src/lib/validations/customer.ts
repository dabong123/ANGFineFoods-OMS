import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contactName: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email("Enter a valid email").max(200).optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  // Only meaningful when the actor has customers:edit:all — sales agents are
  // always pinned to themselves server-side regardless of what's sent here.
  salesAgentId: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
