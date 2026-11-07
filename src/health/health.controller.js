export const healthController = {
  check(_, res) {
    res.status(200).json({ message: 'Server is alive!' })
  }
}