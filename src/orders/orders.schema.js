import z from 'zod'
import { idSchema } from '../products/products.schema.js'

const itemSchema = z.object({
  productId: idSchema,
  quantity: z.int().min(1).max(100)
})

export const inputOrderSchema = z.object({
  items: z.array(itemSchema)
    .min(1)
    .refine(
      (items) => new Set(items.map(({ productId }) => productId)).size === items.length,
      { message: 'Products must not repeat' }
    )
})

export const outputOrderSchema = z.object({
  id: z.number().positive(),
  status: z.enum([ 'pending', 'paid', 'cancelled' ]),
  items: z.array(itemSchema.extend({
    unitPrice: z.coerce.number(),
    name: z.string().optional()
  })),
  total: z.coerce.number(),
  createdAt: z.date()
})