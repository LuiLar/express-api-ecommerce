export const notFound = (req, res) => {
  res.status(404).json({ message: `Unknown ${req.method} at ${req.originalUrl} route` })
}