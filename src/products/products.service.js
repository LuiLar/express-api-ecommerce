import { productsRepository } from './products.repository.js'

export const productsService = {
  list(filters) {
    return productsRepository.findAll(filters)
  },

  getById(id) {
    return productsRepository.findById(id)
  },

  async create(data) {
    return await productsRepository.create(data)
  }
}