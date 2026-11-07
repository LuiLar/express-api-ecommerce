import { Router } from 'express'
import { productsController } from './products.controller.js'

export const productsRouter = Router()

productsRouter.get('/', productsController.list)
productsRouter.get('/:id', productsController.byId)
productsRouter.post('/', productsController.create)