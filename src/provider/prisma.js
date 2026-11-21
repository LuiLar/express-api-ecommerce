import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '../generated/prisma/client.ts'
import { DATABASE_URL } from '../config/env.js'

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter, omit: { user: { hashedPass: true } } }) // secure by default: hash only where asked

export default prisma
export { Prisma }