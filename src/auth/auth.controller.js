import { authLoginSchema, authRegisterSchema } from './auth.schema.js'
import { authService } from './auth.service.js'

const mapIssues = (issues) => issues.map(({ path, message }) => ({ field: path[ 0 ], message }))

export const authController = {
  async register(req, res) {
    const result = authRegisterSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json(mapIssues(result.error.issues))
    }

    const createdCredential = await authService.create(result.data)

    res.status(201).json(createdCredential)
  },

  async login(req, res) {
    const result = authLoginSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json(mapIssues(result.error.issues))
    }

    const token = await authService.verifyCredentials(result.data)

    res.status(200).json({ token })
  }
}