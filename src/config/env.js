if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).trim() === '') {
  throw Error("Missing JWT_SECRET var or its value")
}
if (process.env.ADMIN_EMAIL && (!process.env.ADMIN_PASSWORD_HASH || String(process.env.ADMIN_PASSWORD_HASH).trim() === '')) {
  throw Error("Missing ADMIN_PASSWORD_HASH var or its value")
}
if (process.env.ADMIN_PASSWORD_HASH && (!process.env.ADMIN_EMAIL || String(process.env.ADMIN_EMAIL).trim() === '')) {
  throw Error("Missing ADMIN_EMAIL var or its value")
}
if (process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD_HASH.startsWith('$argon2id$')) {
  throw Error("Invalid argon2 hash for admin credentials")
}

export const JWT_SECRET = process.env.JWT_SECRET
export const PORT = !!process.env.PORT ? process.env.PORT : 3000
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL
export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH