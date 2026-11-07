export const logger = (req, res, next) => {
  const startTime = Date.now()

  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startTime}ms`))

  next()
}