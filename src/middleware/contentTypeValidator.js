import { HttpError } from '../error/HttpError.js'

export const contentTypeValidator = (req, _, next) => {
  if (!req.is('application/json')) {
    throw new HttpError(415, '"Content-Type" must be "application/json"')
  }

  next()
}