import { z } from "zod";
import { isQuantity, isSlug, isSymbol, isUuid } from "./http.js";

export const createOrderBodySchema = z
  .object({
    elementSymbol: z.string(),
    quantity: z.number(),
    compoundSlug: z.string().optional().nullable(),
  })
  .superRefine((body, ctx) => {
    if (!isSymbol(body.elementSymbol)) {
      ctx.addIssue({
        code: "custom",
        message: "elementSymbol must be 1–3 letters",
        path: ["elementSymbol"],
      });
    }
    if (!isQuantity(body.quantity)) {
      ctx.addIssue({
        code: "custom",
        message:
          "quantity must be 0.0001–1000000 g with at most 4 decimal places",
        path: ["quantity"],
      });
    }
    if (
      body.compoundSlug != null &&
      body.compoundSlug !== undefined &&
      !isSlug(body.compoundSlug)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "compoundSlug must be a slug",
        path: ["compoundSlug"],
      });
    }
  });

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export const idempotencyKeySchema = z
  .string()
  .refine((v) => isUuid(v), { message: "Idempotency-Key must be a UUID" });
