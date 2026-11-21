import prisma from "../provider/prisma.js"

export const ordersRepository = {
  stats() {
    return prisma.$queryRaw`
      SELECT
        p.id AS "productId",
        p.name,
        COALESCE(SUM(s.quantity), 0) AS "unitsSold",
        COALESCE(SUM(s.quantity * s.unit_price), 0) AS revenue
      FROM products p
      LEFT JOIN (
        SELECT oi.product_id, oi.quantity, oi.unit_price
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status <> 'cancelled'
      ) s ON s.product_id = p.id
      GROUP BY p.id, p.name
      ORDER BY revenue DESC, p.id ASC
    `
  },

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