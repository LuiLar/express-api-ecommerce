import { HttpError } from '../error/HttpError.js'
import { authRepository } from '../auth/auth.repository.js'

export const requireRole = (role) => (req, _, next) => {
  const user = authRepository.getById(req.user.id)

  if (!user) {
    throw new HttpError(401, 'Invalid or expired token')
  }

  if (user.role !== role) {
    throw new HttpError(403, 'User does not have enough permissions')
  }

  next()
}