import request from 'supertest'
import argon2 from 'argon2'
import { app } from '../app.js'
import { authService } from '../auth/auth.service.js'

const ADMIN = { email: 'admin@test.com', password: 'Admin123!' }
const CUSTOMER = { email: 'customer@test.com', password: 'Customer123!' }

const login = async ({ email, password }) => {
  const res = await request(app).post('/auth/login').send({ email, password })
  return res.body.token
}

let adminToken
let customerToken

beforeAll(async () => {
  authService.createAdmin(ADMIN.email, await argon2.hash(ADMIN.password))
  await request(app).post('/auth/register').send(CUSTOMER)

  adminToken = await login(ADMIN)
  customerToken = await login(CUSTOMER)
})

describe('GET /products', () => {
  test('returns 200 with the seeded products', async () => {
    const res = await request(app).get('/products')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      { id: 1, name: 'Remera', price: 20 },
      { id: 2, name: 'Gorra', price: 10 },
    ])
  })

  test('filters by maxPrice (inclusive)', async () => {
    const res = await request(app).get('/products?maxPrice=10')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([ { id: 2, name: 'Gorra', price: 10 } ])
  })

  test('treats an empty maxPrice as no filter', async () => {
    const res = await request(app).get('/products?maxPrice=')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  test('returns 400 when maxPrice is not a number', async () => {
    const res = await request(app).get('/products?maxPrice=abc')

    expect(res.status).toBe(400)
  })
})

describe('GET /products/:id', () => {
  test('returns 200 with the product', async () => {
    const res = await request(app).get('/products/1')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 1, name: 'Remera', price: 20 })
  })

  test('returns 404 when the product does not exist', async () => {
    const res = await request(app).get('/products/999')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Product not found' })
  })
})

describe('POST /products', () => {
  const taza = { name: 'Taza', price: 5 }

  test('returns 401 without a token', async () => {
    const res = await request(app).post('/products').send(taza)

    expect(res.status).toBe(401)
  })

  test('returns 403 for a customer', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(taza)

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
      .send(taza)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ id: 3, ...taza })

    const list = await request(app).get('/products')
    expect(list.body).toContainEqual({ id: 3, ...taza })
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
})
