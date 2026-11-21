import { HttpError } from '../error/HttpError.js'
import prisma from '../provider/prisma.js'

export const productsRepository = {
  findAll({ maxPrice } = {}) {
    let args = { orderBy: { id: 'asc' } }

    if (maxPrice !== undefined) {
      args = Object.assign(args, { where: { price: { lte: maxPrice } } })
    }

    return prisma.product.findMany(args)
  },

  findById(id) {
    return prisma.product.findUnique({ where: { id } })
  },

  findByIds(ids, db = prisma) {
    return db.product.findMany({ where: { id: { in: ids } } })
  },

  decrementStock(productId, quantity, db = prisma) {
    return db.product.updateMany({
      where: { id: productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } }
    })
  },

  async create({ name, price }) {
    try {
      return await prisma.product.create({ data: { name, price } })
    } catch (e) {
      if (e.code === 'P2002') {
        throw new HttpError(409, 'Product already exists')
      }

      throw e
    }
  }
}