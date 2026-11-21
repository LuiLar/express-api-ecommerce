import prisma from "../provider/prisma.js"

export const ordersRepository = {
  findByUserId(userId) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ],
      include: {
        items: {
          orderBy: { productId: 'asc' },
          include: { product: { select: { name: true } } }
        }
      }
    })
  },

  async create({ userId, total, items }, db = prisma) {
    return await db.order.create({
      data: { userId, total, items: { create: items } },
      include: { items: { orderBy: { productId: 'asc' } } }
    })
  }
}