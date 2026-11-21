import prisma from "../provider/prisma.js"

export const ordersRepository = {
  async create({ userId, total, items }, db = prisma) {
    return await db.order.create({
      data: { userId, total, items: { create: items } },
      include: { items: { orderBy: { productId: 'asc' } } }
    })
  }
}