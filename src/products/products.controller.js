import { productsService } from './products.service.js'
import { idSchema, inputProductsSchema, outputProductSchema } from './products.schema.js'

export const productsController = {
  async list(req, res) {
    const queryRaw = req.query.maxPrice
    let response

    if (queryRaw == undefined || queryRaw == '') {
      response = await productsService.list()
      return res.status(200).json(response.map(p => outputProductSchema.parse(p)))
    }

    const maxPrice = Number(queryRaw)

    if (!Number.isFinite(maxPrice)) {
      return res.status(400).json({ message: 'maxPrice has to be a number' })
    }

    response = await productsService.list({ maxPrice })
    res.status(200).json(response.map(p => outputProductSchema.parse(p)))
  },

  async byId(req, res) {
    const paramId = idSchema.safeParse(Number(req.params.id))

    if (!paramId.success) {
      return res.status(400).json({ message: 'Invalid ID' })
    }

    const response = await productsService.getById(paramId.data)

    if (!response) {
      return res.status(404).json({ message: 'Product not found' })
    }

    res.status(200).json(outputProductSchema.parse(response))
  },

  async create(req, res) {
    const result = inputProductsSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json(result.error.issues.map(({ path, message }) => ({ field: path[ 0 ], message })))
    }

    const response = await productsService.create(result.data)

    res.status(201).json(outputProductSchema.parse(response))

  }
}