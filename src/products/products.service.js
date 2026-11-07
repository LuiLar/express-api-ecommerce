import { productsRepository } from './products.repository.js'

export const productsService = {
  list(filters) {
    return productsRepository.findAll(filters)
  },

  getById(id) {
    return productsRepository.findById(id)
  },

  create(data) {
    return productsRepository.create(data)
  }
}