if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).trim() === '') throw Error("Missing JWT_SECRET var or its value")

export const JWT_SECRET = process.env.JWT_SECRET
export const PORT = !!process.env.PORT ? process.env.PORT : 3000