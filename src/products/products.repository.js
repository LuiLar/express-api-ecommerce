// TODO: Remove mocked data in favor of a DB
const products = [
  { id: 1, name: 'Remera', price: 20 },
  { id: 2, name: 'Gorra', price: 10 },
]
let nextId = 3

export const productsRepository = {
  findAll({ maxPrice } = {}) {
    if (maxPrice === undefined) return [ ...products ]
    return products.filter(p => p.price <= maxPrice)
  },

  findById(id) {
    return products.find(p => p.id === id)
  },

  create({ name, price }) {
    const newProduct = { id: ++nextId, name, price }
    products.push(newProduct)
    return newProduct
  }
}