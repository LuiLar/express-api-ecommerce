import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { requireRole } from '../middleware/requireRole.js'
import { productsController } from './products.controller.js'

export const productsRouter = Router()

productsRouter.get('/', productsController.list)
productsRouter.get('/:id', productsController.byId)
productsRouter.post('/', auth, requireRole('admin'), productsController.create)