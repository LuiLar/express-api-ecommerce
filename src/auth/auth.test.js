import request from 'supertest'
import jwt from 'jsonwebtoken'
import { app } from '../app.js'

const register = (body) => request(app).post('/auth/register').send(body)
const login = (body) => request(app).post('/auth/login').send(body)

describe('POST /auth/register', () => {
  test('returns 201 with id, email and role, never the hash', async () => {
    const res = await register({ email: 'ana@mail.com', password: 'Secreta123!' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ id: expect.any(Number), email: 'ana@mail.com', role: 'customer' })
  })

  test('returns 409 when the email is already registered, ignoring case and spaces', async () => {
    await register({ email: 'dup@mail.com', password: 'Secreta123!' })

    const res = await register({ email: '  DUP@Mail.com ', password: 'Secreta123!' })

    expect(res.status).toBe(409)
    expect(res.body).toEqual({ message: 'Email already registered' })
  })

  test('ignores a role sent in the body', async () => {
    const res = await register({ email: 'hacker@mail.com', password: 'Secreta123!', role: 'admin' })

    expect(res.status).toBe(201)
    expect(res.body.role).toBe('customer')
  })

  test.each([
    [ 'empty body', {} ],
    [ 'invalid email', { email: 'nope', password: 'Secreta123!' } ],
    [ 'weak password', { email: 'weak@mail.com', password: 'abc' } ],
  ])('returns 400 for %s', async (_, body) => {
    const res = await register(body)

    expect(res.status).toBe(400)
  })

  test('only one of two simultaneous registrations with the same email succeeds', async () => {
    const body = { email: 'race@mail.com', password: 'Secreta123!' }

    const statuses = (await Promise.all([ register(body), register(body) ])).map(r => r.status)

    expect(statuses.sort()).toEqual([ 201, 409 ])
  })

  test('return 415 when "Content-Type" is not "application/json"', async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'text/plain')
      .send("")

    expect(res.status).toBe(415)
    expect(res.body).toEqual({ message: '"Content-Type" must be "application/json"' })
  })
})

describe('POST /auth/login', () => {
  const user = { email: 'login@mail.com', password: 'Secreta123!' }

  beforeAll(async () => {
    await register(user)
  })

  test('returns 200 with a token whose payload only has sub, iat and exp (15 minutes)', async () => {
    const res = await login(user)

    expect(res.status).toBe(200)

    const payload = jwt.decode(res.body.token)
    expect(Object.keys(payload).sort()).toEqual([ 'exp', 'iat', 'sub' ])
    expect(payload.exp - payload.iat).toBe(15 * 60)
  })

  test('returns 401 "Invalid credentials" when the password is wrong', async () => {
    const res = await login({ email: user.email, password: 'wrongPass' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: "Invalid credentials" })
  })

  test('returns 401 with the SAME body when the email does not exist', async () => {
    const res = await login({ email: 'wrong@email.com', password: user.password })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: "Invalid credentials" })
  })

  test('accepts the email with different case and surrounding spaces', async () => {
    const res = await login({ email: ` ${user.email.toUpperCase()} `, password: user.password })

    expect(res.status).toBe(200)
  })

  test('returns 400 when the password is empty', async () => {
    const res = await login({ email: user.email, password: '' })

    expect(res.status).toBe(400)
  })

  test('return 415 when "Content-Type" is not "application/json"', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'text/plain')
      .send("")

    expect(res.status).toBe(415)
    expect(res.body).toEqual({ message: '"Content-Type" must be "application/json"' })
  })
})
