import { HttpError } from '../error/HttpError.js'

// TODO: Remove mocked data in favor of a DB
const userCredentials = []
let nextId = 1

export const authRepository = {
  isEmailExist(email) {
    return userCredentials.some(c => c.email === email)
  },

  getById(id) {
    return structuredClone(userCredentials.find(c => c.id === id))
  },

  getByEmail(email) {
    return structuredClone(userCredentials.find(c => c.email === email))
  },

  create({ email, hashedPass, role = 'customer' }) {
    if (this.isEmailExist(email)) {
      throw new HttpError(409, 'Email already registered')
    }

    const newCredential = { id: nextId++, email, hashedPass, role }

    userCredentials.push(newCredential)

    return structuredClone({ id: newCredential.id, email: newCredential.email, role: newCredential.role })
  }
}