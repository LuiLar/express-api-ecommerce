import express from 'express'
import { logger } from './middleware/logger.js'
import { healthRouter } from './health/health.routes.js'
import { authRouter } from "./auth/auth.routes.js"
import { productsRouter } from './products/products.routes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { contentTypeValidator } from './middleware/contentTypeValidator.js'

export const app = express()

app.use(express.json())
app.use(logger)
app.use('/', healthRouter)
app.use('/auth', contentTypeValidator, authRouter)
app.use('/products', productsRouter)
app.use(notFound)
app.use(errorHandler)