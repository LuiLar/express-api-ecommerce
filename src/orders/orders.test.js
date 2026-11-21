import request from 'supertest'
import argon2 from 'argon2'
import { app } from '../app.js'
import { authService } from '../auth/auth.service.js'
import prisma from '../provider/prisma.js'

const ADMIN = { email: 'admin@test.com', password: 'Admin123!' }
const CUSTOMER = { email: 'customer@test.com', password: 'Customer123!' }

const login = async (body) => (await request(app).post('/auth/login').send(body)).body.token
const postOrder = (token, body) => request(app)
  .post('/orders')
  .set('Authorization', `Bearer ${token}`)
  .send(body)
const stockOf = async (id) => (await prisma.product.findUnique({ where: { id } })).stock

let adminToken
let customerToken
let taza // price 10.99, stock 5
let chicle // price 0.10, stock 10
let ultima // price 20.00, stock 1

beforeAll(async () => {
  await prisma.order.deleteMany({})
  await prisma.user.deleteMany({})
  await authService.createAdmin(ADMIN.email, await argon2.hash(ADMIN.password))
  await request(app).post('/auth/register').send(CUSTOMER)
  adminToken = await login(ADMIN)
  customerToken = await login(CUSTOMER)
})

// Each test starts with fresh stock and no orders
beforeEach(async () => {
  await prisma.order.deleteMany({})
  await prisma.product.deleteMany({})
    ;[ taza, chicle, ultima ] = await prisma.product.createManyAndReturn({
      data: [
        { name: 'Taza', price: 10.99, stock: 5 },
        { name: 'Chicle', price: 0.10, stock: 10 },
        { name: 'Ultima', price: 20.00, stock: 1 }
      ]
    })
})

afterAll(async () => {
  await prisma.order.deleteMany({})
  await prisma.$disconnect()
})

describe('POST /orders', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).post('/orders').send({ items: [ { productId: taza.id, quantity: 1 } ] })

    expect(res.status).toBe(401)
  })

  test('returns 403 for an admin', async () => {
    const res = await postOrder(adminToken, { items: [ { productId: taza.id, quantity: 1 } ] })

    expect(res.status).toBe(403)
  })

  test('returns 201 with the order, prices taken from the DB and an exact total', async () => {
    const res = await postOrder(customerToken, {
      items: [
        { productId: taza.id, quantity: 3, unitPrice: 0.01 }, // unitPrice from the client must be ignored
        { productId: chicle.id, quantity: 3 }
      ]
    })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      id: expect.any(Number),
      status: 'pending',
      total: 33.27, // 3 × 10.99 + 3 × 0.10, no float drift
      createdAt: expect.any(String),
      items: [
        { productId: taza.id, quantity: 3, unitPrice: 10.99 },
        { productId: chicle.id, quantity: 3, unitPrice: 0.1 }
      ]
    })
  })

  test('decrements the stock of each product', async () => {
    await postOrder(customerToken, { items: [ { productId: taza.id, quantity: 2 }, { productId: chicle.id, quantity: 4 } ] })

    expect(await stockOf(taza.id)).toBe(3)
    expect(await stockOf(chicle.id)).toBe(6)
  })

  test('accepts buying the whole stock', async () => {
    const res = await postOrder(customerToken, { items: [ { productId: taza.id, quantity: 5 } ] })

    expect(res.status).toBe(201)
    expect(await stockOf(taza.id)).toBe(0)
  })

  test.each([
    [ 'missing items', {} ],
    [ 'empty items', { items: [] } ],
    [ 'quantity 0', { items: [ { productId: 1, quantity: 0 } ] } ],
    [ 'decimal quantity', { items: [ { productId: 1, quantity: 1.5 } ] } ],
    [ 'quantity over 100', { items: [ { productId: 1, quantity: 101 } ] } ],
    [ 'productId out of INT range', { items: [ { productId: 2147483648, quantity: 1 } ] } ],
    [ 'duplicated productId', { items: [ { productId: 1, quantity: 1 }, { productId: 1, quantity: 2 } ] } ]
  ])('returns 400 for %s', async (_, body) => {
    const res = await postOrder(customerToken, body)

    expect(res.status).toBe(400)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('returns 404 when a product does not exist, and changes nothing', async () => {
    const res = await postOrder(customerToken, {
      items: [ { productId: taza.id, quantity: 1 }, { productId: ultima.id + 1000, quantity: 1 } ]
    })

    expect(res.status).toBe(404)
    expect(await stockOf(taza.id)).toBe(5)
    expect(await prisma.order.count()).toBe(0)
  })

  test('returns 409 when the stock is not enough, and changes nothing (rollback)', async () => {
    const res = await postOrder(customerToken, {
      items: [ { productId: taza.id, quantity: 2 }, { productId: ultima.id, quantity: 2 } ]
    })

    expect(res.status).toBe(409)
    expect(await stockOf(taza.id)).toBe(5)
    expect(await stockOf(ultima.id)).toBe(1)
    expect(await prisma.order.count()).toBe(0)
  })

  test('two simultaneous orders for the last unit: one 201, one 409, stock never negative', async () => {
    const body = { items: [ { productId: ultima.id, quantity: 1 } ] }
    const responses = await Promise.all([ postOrder(customerToken, body), postOrder(customerToken, body) ])

    expect(responses.map(r => r.status).sort()).toEqual([ 201, 409 ])
    expect(await stockOf(ultima.id)).toBe(0)
    expect(await prisma.order.count()).toBe(1)
  })
})
