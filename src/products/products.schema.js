import z from 'zod'

export const idSchema = z.int().positive().max(2147483647)

export const inputProductsSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().positive().multipleOf(0.01).max(99_999_999.99)
})

export const outputProductSchema = z.object({
  id: z.number().positive(),
  name: z.string(),
  price: z.coerce.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})