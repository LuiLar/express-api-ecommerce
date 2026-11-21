import { inputOrderSchema, outputOrderSchema } from "./orders.schema.js"
import { ordersService } from "./orders.service.js"

export const ordersController = {
  async list(req, res) {
    const orders = await ordersService.list(req.user.id)

    res.status(200).json(orders.map(o =>
      outputOrderSchema.parse({
        ...o,
        items: o.items.map(({ product, ...item }) => ({ ...item, name: product.name }))
      })
    ))
  },

  async create(req, res) {
    const result = inputOrderSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json(result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })))
    }

    const createdOrder = await ordersService.create(req.user.id, result.data.items)

    res.status(201).json(outputOrderSchema.parse(createdOrder))
  }
}