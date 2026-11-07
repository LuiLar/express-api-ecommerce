import z from 'zod'

export const productsSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().positive()
})