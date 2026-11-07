import express from 'express'
import z from 'zod'

const app = express()
const PORT = process.env.PORT ?? 3000

// TODO: Remove mocked data in favor of a DB
const products = [
  { id: 1, name: 'Remera', price: 20 },
  { id: 2, name: 'Gorra', price: 10 },
]
let nextId = 3

const Product = z.object({
  name: z.string().min(1),
  price: z.number().positive()
})

app.use(express.json())

// Custom logger and result timmer middleware
app.use((req, res, next) => {
  const startTime = Date.now()

  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startTime}ms`))

  next()
})

// Health GET endpoint middleware
app.get('/', (_, res) => {
  res.status(200).json({ message: 'Server is alive!' })
})

/////////////////////////////////////////////////////////////////////////////////////////////////
// PRODUCTS resource
//
// Get All
//
app.get('/products', (req, res) => {
  const queryRaw = req.query.maxPrice

  if (queryRaw !== undefined && queryRaw !== '') {
    const maxPrice = Number(queryRaw)

    if (Number.isNaN(maxPrice)) {
      res.status(400).json({ message: 'maxPrice has to be a number' })
    } else {
      res.status(200).json(products.filter(p => p.price <= maxPrice))
    }
  } else {
    res.status(200).json(products)
  }
})
//
// Get byID
//
app.get('/products/:id', (req, res) => {
  const ID = +req.params.id // to number
  const foundProduct = products.find(p => p.id === ID)

  if (!foundProduct) {
    res.status(404).json({ message: 'Product not found' })
  } else {
    res.status(200).json(foundProduct)
  }
})
//
// Create product
//
app.post('/products', (req, res) => {
  const schemaValidation = Product.safeParse(req.body)

  if (!schemaValidation.success) {
    res.status(400).json(schemaValidation.error?.issues)
  } else {
    const { name, price } = schemaValidation.data

    const newLength = products.push({ id: nextId++, name, price })

    res.status(201).json(products[ newLength - 1 ])
  }
})
//
/////////////////////////////////////////////////////////////////////////////////////////////////

// Unknown routes
app.all('/{*splat}', (req, res) => {
  res.status(404).json({ message: `Unknown ${req.method} at ${req.originalUrl} route` })
})

// Error handler
app.use((err, _, res, __) => {
  const status = err.status ?? 500

  if (status === 500) console.error(err)

  res.status(status).json({ message: status === 500 ? 'Internal server error' : err.message })
})

app.listen(PORT, () => console.log(`Server running on localhost:${PORT}`))