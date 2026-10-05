import { z } from "zod";
import { isQuantity, isSlug, isSymbol, isUuid } from "./http.js";

/** Validates the POST /api/v1/orders body; the field rules are shared with http.ts. */
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
    if (body.compoundSlug != null && !isSlug(body.compoundSlug)) {
      ctx.addIssue({
        code: "custom",
        message: "compoundSlug must be a slug",
        path: ["compoundSlug"],
      });
    }
  });

/** Validates the optional Idempotency-Key header; it must be a UUID because it becomes the order id. */
export const idempotencyKeySchema = z
  .string()
  .refine((value) => isUuid(value), {
    message: "Idempotency-Key must be a UUID",
  });
