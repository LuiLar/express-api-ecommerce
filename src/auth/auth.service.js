import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { HttpError } from '../error/HttpError.js'
import { JWT_SECRET } from '../config/env.js'
import { authRepository } from './auth.repository.js'
import { emailSchema } from './auth.schema.js'

const dummyHash = await argon2.hash('make me a dummy hash')

export const authService = {
  async createAdmin(email, hash) {
    const emailSchemaResult = emailSchema.safeParse(email)

    if (!emailSchemaResult.success) {
      throw Error("Admin email did not pass validation")
    }

    const existing = await authRepository.getByEmail(emailSchemaResult.data)

    if (existing?.role === 'admin') return
    // Fail-fast: promoting a customer would hand admin to whoever registered that email first
    if (existing) throw Error("ADMIN_EMAIL belongs to a non-admin user")

    await authRepository.create({ email: emailSchemaResult.data, hashedPass: hash, role: 'admin' })
  },

  async create({ email, password }) {
    const hashedPass = await argon2.hash(password)

    return await authRepository.create({ email, hashedPass })
  },

  async verifyCredentials({ email, password }) {
    const foundCredentials = await authRepository.getByEmail(email)

    if (!foundCredentials) {
      await argon2.verify(dummyHash, password)
      throw new HttpError(401, 'Invalid credentials')
    }

    const { id, hashedPass } = foundCredentials
    const isPassLegit = await argon2.verify(hashedPass, password)

    if (!isPassLegit) {
      throw new HttpError(401, 'Invalid credentials')
    }

    const payload = { sub: id }

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
  }
}