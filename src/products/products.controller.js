import { productsService } from './products.service.js'
import { productsSchema } from './products.schema.js'

export const productsController = {
  list(req, res) {
    const queryRaw = req.query.maxPrice

    if (queryRaw == undefined || queryRaw == '') {
      return res.status(200).json(productsService.list())
    }

    const maxPrice = Number(queryRaw)

    if (!Number.isFinite(maxPrice)) {
      return res.status(400).json({ message: 'maxPrice has to be a number' })
    }

    res.status(200).json(productsService.list({ maxPrice }))
  },

  byId(req, res) {
    const product = productsService.getById(Number(req.params.id))

    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    res.status(200).json(product)
  },

  create(req, res) {
    const result = productsSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json(result.error.issues)
    }

    res.status(201).json(productsService.create(result.data))
  }
}