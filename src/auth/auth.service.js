import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { HttpError } from '../error/HttpError.js'
import { JWT_SECRET } from '../config/env.js'
import { authRepository } from './auth.repository.js'

const dummyHash = await argon2.hash('make me a dummy hash')

export const authService = {
  async create({ email, password }) {
    if (authRepository.isEmailExist(email)) {
      throw new HttpError(409, 'Email already registered')
    }

    const hashedPass = await argon2.hash(password)

    return authRepository.create({ email, hashedPass })
  },

  async verifyCredentials({ email, password }) {
    const foundCredentials = authRepository.getByEmail(email)

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