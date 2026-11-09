import z from 'zod'

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().nonempty())
export const passwordSchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[!@#$%^&*()_+]/, { message: 'Password must contain at least one special character' })

export const authRegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})

export const authLoginSchema = z.object({
  email: emailSchema,
  password: z.string().nonempty()
})