# express-api-ecommerce

A REST API for a small e-commerce: products, user accounts with roles, and orders with stock control. It is built with Express 5 and PostgreSQL (through Prisma 7) and covered by 60 integration tests that run against a real database.

## Features

- **Products:** public catalog with a price filter. Only admins can create products.
- **Auth:** register and login with argon2-hashed passwords and short-lived JWTs (15 min). Roles are `admin` and `customer`.
- **Orders:**
  - Customers place orders. Stock is checked and decremented inside a single transaction, so two buyers can never get the last unit.
  - Customers can list their own orders.
  - Admins get per-product sales stats.
- **Validation:** Zod at every boundary. The database enforces the same critical rules (`UNIQUE`, `NOT NULL`, `CHECK`) as a second line of defense.
- **Errors:** every error is returned as JSON with consistent status codes. Internal details never leak on a 500.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (ESM, plain JavaScript) |
| HTTP | Express 5 |
| Database | PostgreSQL 17 + Prisma 7 (`@prisma/adapter-pg`) |
| Validation | Zod 4 |
| Auth | argon2, jsonwebtoken |
| Tests | Jest 30 + Supertest |
| Package manager | pnpm |

## Getting started

### Prerequisites

- Node.js 22+ (developed on Node 26)
- pnpm 10+
- PostgreSQL 17 running locally on port 5432

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create the databases

You need two databases: one for development and one for the tests. The test suite deletes all data in its database on every run, so the two must never be the same.

```bash
createdb ecommerce
createdb ecommerce_test
```

### 3. Configure the environment

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Secret used to sign the tokens. Use a long random string |
| `DATABASE_URL` | Yes | Must start with `postgresql://`, for example `postgresql://user:password@localhost:5432/ecommerce` |
| `PORT` | No | Defaults to `3000` |
| `ADMIN_EMAIL` | No | Email of the initial admin. Set it together with `ADMIN_PASSWORD_HASH`, or leave both empty |
| `ADMIN_PASSWORD_HASH` | No | argon2id hash of the admin password (see step 5) |

The app checks these variables on startup and refuses to start if any of them is missing or invalid.

### 4. Run the migrations

```bash
# Development database (reads DATABASE_URL from .env)
pnpm prisma migrate deploy
pnpm prisma generate

# Test database: a variable set on the command line wins over .env
DATABASE_URL=postgresql://$USER@localhost:5432/ecommerce_test pnpm prisma migrate deploy
```

`pnpm prisma generate` writes the Prisma client to `src/generated/prisma`. That folder is not committed, so you have to run it after every fresh clone and after every schema change.

### 5. Create the initial admin (optional)

Registration always creates `customer` accounts. The only way to get an admin is to seed one at startup:

```bash
pnpm -s hash:password
```

The script asks for a password, validates it with the same rules as registration and prints only the hash. Add it to `.env` in single quotes, because the hash contains `$` characters:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH='$argon2id$v=19$...'
```

On startup the admin is created if it doesn't exist yet. Restarting is safe, because the seed is idempotent. If that email already belongs to a customer, the server refuses to start instead of promoting the account.

### 6. Run

```bash
pnpm dev
curl -i http://localhost:3000/
```

## API

Base URL: `http://localhost:3000`. Request bodies must be `application/json`. Protected routes need an `Authorization: Bearer <token>` header.

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | Health check |
| `POST` | `/auth/register` | Public | Create a customer account |
| `POST` | `/auth/login` | Public | Get a JWT |
| `GET` | `/products` | Public | List products. Optional `?maxPrice=` (inclusive) |
| `GET` | `/products/:id` | Public | Get one product |
| `POST` | `/products` | Admin | Create a product |
| `POST` | `/orders` | Customer | Place an order |
| `GET` | `/orders` | Customer | List my orders, newest first |
| `GET` | `/orders/stats` | Admin | Units sold and revenue per product |

### Examples

**Register and log in**

```bash
curl -i -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@mail.com","password":"Secret123!"}'
# 201 {"id":1,"email":"ana@mail.com","role":"customer"}

curl -i -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@mail.com","password":"Secret123!"}'
# 200 {"token":"eyJ..."}
```

Emails are trimmed and lowercased before they are stored, so `' Ana@Mail.com'` and `ana@mail.com` are the same account. A password needs at least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character.

**Create a product (admin)**

```bash
curl -i -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Mug","price":10.99}'
# 201 {"id":1,"name":"Mug","price":10.99,"createdAt":"...","updatedAt":"..."}
```

`price` must be positive, have at most 2 decimals and be at most `99999999.99`, which is the limit of `DECIMAL(10,2)`.

**Place an order (customer)**

```bash
curl -i -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{"items":[{"productId":1,"quantity":3}]}'
# 201 {"id":1,"status":"pending","total":32.97,"createdAt":"...",
#      "items":[{"productId":1,"quantity":3,"unitPrice":10.99}]}
```

- Prices always come from the database. Any price sent by the client is ignored.
- `quantity` is an integer from 1 to 100, and a product can appear only once per order.
- The whole order is all-or-nothing. If one item fails (unknown product or not enough stock), no stock changes and no order is created.

**Sales stats (admin)**

```bash
curl -i http://localhost:3000/orders/stats -H "Authorization: Bearer $ADMIN_TOKEN"
# 200 [{"productId":1,"name":"Mug","unitsSold":3,"revenue":32.97}, ...]
```

- Every product is listed, including products that were never sold (with `0`).
- Cancelled orders are not counted.
- Revenue uses the price paid at checkout, not the current price.
- Results are sorted by revenue, highest first.

### Status codes and error format

| Code | When |
|---|---|
| `200` / `201` | Success / resource created |
| `400` | Invalid input |
| `401` | Missing or invalid token, wrong credentials, or the token's user no longer exists |
| `403` | Authenticated, but the role is not allowed |
| `404` | Resource or route not found |
| `409` | Duplicate (email or product name) or not enough stock |
| `415` | Body is not `application/json` |
| `500` | Unexpected error (no details are exposed) |

A validation error (`400`) returns a list with the field and the problem:

```json
[{ "field": "items.0.quantity", "message": "Too big: expected number to be <=100" }]
```

Every other error returns a single message:

```json
{ "message": "Product not found" }
```

## Tests

```bash
pnpm test                    # whole suite
pnpm test -t "POST /orders"  # filter by test name
pnpm test --silent=false     # show the errors the error handler logs (hidden by default)
```

- The tests run against `ecommerce_test`. They never read `.env`: their variables live in `.jest/setEnvVars.js`.
- Each suite clears its tables and creates its own data with Prisma, so the tests don't depend on their order or on ids.
- The suites run serially (`--runInBand`) because they share the same database.
- Two tests fire simultaneous requests to check the race conditions: the same email registered twice, and two buyers competing for the last unit of a product.

## Project structure

```
prisma/
  schema.prisma        # models (users, products, orders, order_items)
  migrations/          # SQL migrations, including hand-written CHECK constraints
src/
  server.js            # seeds the admin, then starts listening
  app.js               # middlewares, routers, 404 and error handler
  config/env.js        # the only place that reads process.env; fails fast on startup
  provider/prisma.js   # single Prisma client instance
  error/HttpError.js   # Error with an HTTP status
  middleware/          # logger, auth, requireRole, contentTypeValidator, notFound, errorHandler
  health/
  auth/                # routes, controller, service, repository, schema, tests
  products/            # same layers
  orders/              # same layers
scripts/
  hash-password.js     # generates ADMIN_PASSWORD_HASH
```

Each feature is split into layers:
- **Routes** map methods and paths.
- **Controllers** translate between HTTP and the service. They validate input and shape the output with Zod.
- **Services** hold the business rules and never touch `req` or `res`.
- **Repositories** access the database and translate Prisma errors.

## Design notes

- **Money is never a float.** Prices are `DECIMAL(10,2)` and order totals are computed with `Prisma.Decimal`, so `3 × 0.10` is `0.30` and not `0.30000000000000004`. Prices are returned as JSON numbers.
- **The stock race is closed in SQL.** The stock is checked and decremented in the same statement (`UPDATE ... WHERE stock >= quantity`). When no row is updated, the order fails with `409` and the transaction rolls back. A `CHECK (stock >= 0)` in the database backs it up.
- **No deadlocks between orders.** Items are processed in ascending `productId` order, so concurrent orders always lock rows in the same order.
- **Orders keep the price paid.** Each item stores its `unitPrice` at checkout, so later price changes don't rewrite past orders.
- **The password hash is hidden by default.** The Prisma client omits `hashedPass` from every query. Only the login query asks for it explicitly.
- **Login doesn't reveal which emails exist.** An unknown email and a wrong password return the same `401` and take the same time, because the hash is verified against a dummy hash when the email doesn't exist.
- **Uniqueness lives in the database.** Duplicate emails and product names are rejected by `UNIQUE` constraints, and Prisma's `P2002` error is translated to `409`. A check before inserting would still race.
- **Indexes on foreign keys.** PostgreSQL doesn't create them automatically. `orders.user_id` and `order_items.product_id` are indexed for the "my orders" query and for the `RESTRICT` check that runs when a product is deleted.

## Useful commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start with auto-reload |
| `pnpm test` | Run the test suite |
| `pnpm -s hash:password` | Hash a password for `ADMIN_PASSWORD_HASH` |
| `pnpm prisma <command>` | Prisma CLI with `.env` loaded (`migrate deploy`, `generate`, `migrate status`, ...) |
| `pnpm prisma:studio` | Browse the database in the browser |

## License

[MIT](LICENSE)
