import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/env.js'
import { HttpError } from '../error/HttpError.js'

export const auth = (req, _, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication token required')
  }

  const token = authHeader.split(' ')[ 1 ]

  try {
    const { sub } = jwt.verify(token, JWT_SECRET)
    req.user = { id: sub }
  } catch {
    throw new HttpError(401, 'Invalid or expired token')
  }

  next()
}