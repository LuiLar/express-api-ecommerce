import { createInterface } from 'node:readline/promises'
import argon2 from 'argon2'
import { passwordSchema } from '../src/auth/auth.schema.js'

// The prompt goes to stderr so stdout only carries the hash: `pnpm -s hash:password > file` works.
// ponytail: input is visible while typing; hide it if this ever runs anywhere but a local machine.
const rl = createInterface({ input: process.stdin, output: process.stderr })
const password = await rl.question('Admin password: ')
rl.close()

const result = passwordSchema.safeParse(password)

if (!result.success) {
  for (const { message } of result.error.issues) console.error(`- ${message}`)
  process.exit(1)
}

console.log(await argon2.hash(result.data))
