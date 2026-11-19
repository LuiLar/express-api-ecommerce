import { HttpError } from '../error/HttpError.js'
import prisma from '../provider/prisma.js'

export const authRepository = {
  getById(id) {
    return prisma.user.findUnique({ where: { id } })
  },

  getByEmail(email) {
    return prisma.user.findUnique({ where: { email }, omit: { hashedPass: false } })
  },

  async create({ email, hashedPass, role = 'customer' }) {
    try {
      return await prisma.user.create({ data: { email, hashedPass, role } })
    } catch (e) {
      if (e.code === 'P2002') {
        throw new HttpError(409, 'Email already registered')
      }

      throw e
    }
  }
}