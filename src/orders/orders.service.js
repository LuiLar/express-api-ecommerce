import { HttpError } from "../error/HttpError.js"
import { productsRepository } from "../products/products.repository.js"
import prisma, { Prisma } from "../provider/prisma.js"
import { ordersRepository } from "./orders.repository.js"

export const ordersService = {
  stats() {
    return ordersRepository.stats()
  },

  list(userId) {
    return ordersRepository.findByUserId(userId)
  },

  async create(userId, items) {
    return prisma.$transaction(async (tx) => {
      const itemsAsc = [ ...items ].sort((a, b) => a.productId - b.productId)
      const productsFound = await productsRepository.findByIds(itemsAsc.map(i => i.productId), tx)

      if (productsFound.length !== itemsAsc.length) {
        throw new HttpError(404, 'All or some products not found')
      }

      const productsMap = new Map(productsFound.map(p => ([ p.id, p ])))
      let total = new Prisma.Decimal(0)
      const returnedItems = []

      for (const { productId, quantity } of itemsAsc) {
        const { count } = await productsRepository.decrementStock(productId, quantity, tx)

        if (count < 1) throw new HttpError(409, 'Out of stock')

        const { price } = productsMap.get(productId)
        total = total.add(price.mul(quantity))

        returnedItems.push({ productId, quantity, unitPrice: price })
      }

      return ordersRepository.create({ userId, total, items: returnedItems }, tx)
    })
  }
}