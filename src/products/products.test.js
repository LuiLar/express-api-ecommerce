import request from 'supertest'
import argon2 from 'argon2'
import { app } from '../app.js'
import { authService } from '../auth/auth.service.js'
import prisma from '../provider/prisma.js'

const ADMIN = { email: 'admin@test.com', password: 'Admin123!' }
const CUSTOMER = { email: 'customer@test.com', password: 'Customer123!' }

const login = async ({ email, password }) => {
  const res = await request(app).post('/auth/login').send({ email, password })
  return res.body.token
}

let adminToken
let customerToken

const mockedProducts = [
  { name: 'Remera', price: 10.99 },
  { name: 'Pantalon', price: 10.00 },
  { name: 'Gorra', price: 6.50 }
]
let tempCreatedProds

const mapBodyResponse = ({ name, price }) => ({ name, price })

beforeAll(async () => {
  await prisma.user.deleteMany({})
  await authService.createAdmin(ADMIN.email, await argon2.hash(ADMIN.password))
  await request(app).post('/auth/register').send(CUSTOMER)

  adminToken = await login(ADMIN)
  customerToken = await login(CUSTOMER)

  await prisma.product.deleteMany({})
  tempCreatedProds = await prisma.product.createManyAndReturn({ data: mockedProducts })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /products', () => {
  test('returns 200 with the seeded products', async () => {
    const res = await request(app).get('/products')

    expect(res.status).toBe(200)
    expect(res.body.map(mapBodyResponse)).toEqual(mockedProducts)
  })

  test('filters by maxPrice (inclusive)', async () => {
    const MAX_PRICE_FILTER = 10
    const res = await request(app).get(`/products?maxPrice=${MAX_PRICE_FILTER}`)

    expect(res.status).toBe(200)
    expect(res.body.map(mapBodyResponse)).toEqual(mockedProducts.filter(({ price }) => price <= MAX_PRICE_FILTER))
  })

  test('treats an empty maxPrice as no filter', async () => {
    const res = await request(app).get('/products?maxPrice=')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
  })

  test('returns 400 when maxPrice is not a number', async () => {
    const res = await request(app).get('/products?maxPrice=abc')

    expect(res.status).toBe(400)
  })
})

describe('GET /products/:id', () => {
  test('returns 200 with the product', async () => {
    const res = await request(app).get(`/products/${tempCreatedProds[ 0 ].id}`)

    expect(res.status).toBe(200)
    expect(mapBodyResponse(res.body)).toEqual(mockedProducts[ 0 ])
  })

  test('returns 404 when the product does not exist', async () => {
    const res = await request(app).get(`/products/${tempCreatedProds[ tempCreatedProds.length - 1 ].id + 1}`)

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Product not found' })
  })

  test('returns 404 for the max INT id (valid but missing)', async () => {
    const res = await request(app).get('/products/2147483647')

    expect(res.status).toBe(404)
  })

  test.each([ 'abc', '1.5', '0', '-1', '2147483648', '99999999999' ])('returns 400 when the ID is %s', async (id) => {
    const res = await request(app).get(`/products/${id}`)

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Invalid ID' })
  })
})

describe('POST /products', () => {
  const inputProduct = { name: 'Taza', price: 5.00 }

  test('returns 401 without a token', async () => {
    const res = await request(app).post('/products').send(inputProduct)

    expect(res.status).toBe(401)
  })

  test('returns 403 for a customer', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(inputProduct)

    expect(res.status).toBe(403)
  })

  test('returns 400 with issues when the body is invalid', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '', price: -1 })

    expect(res.status).toBe(400)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('returns 201 and the product is listed afterwards', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(inputProduct)

    expect(res.status).toBe(201)
    expect(Number.isFinite(res.body.id)).toBe(true)
    expect(mapBodyResponse(res.body)).toEqual(inputProduct)

    const byId = await request(app).get(`/products/${res.body.id}`)
    expect(byId.status).toBe(200)
    expect(byId.body).toEqual(res.body)
  })

  test('returns 201 for the max price allowed by DECIMAL(10,2)', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Max price', price: 99_999_999.99 })

    expect(res.status).toBe(201)
    expect(res.body.price).toBe(99_999_999.99)
  })

  test('returns 400 for the first price above DECIMAL(10,2)', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Over max price', price: 100_000_000 })

    expect(res.status).toBe(400)
    expect(res.body.map(({ field }) => field)).toEqual([ 'price' ])
  })

  test('return 415 when "Content-Type" is not "application/json"', async () => {
    const res = await request(app)
      .post('/products')
      .set('Content-Type', 'text/plain')
      .set('Authorization', `Bearer ${adminToken}`)
      .send("taza")

    expect(res.status).toBe(415)
    expect(res.body).toEqual({ message: '"Content-Type" must be "application/json"' })
  })

  test('return 409 when product already exist', async () => {
    const tempProd = { name: 'Temp', price: 43.84 }

    let res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(tempProd)

    expect(res.status).toBe(201)

    res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(tempProd)

    expect(res.status).toBe(409)
  })
})
