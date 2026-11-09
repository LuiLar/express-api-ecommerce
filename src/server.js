import { app } from './app.js'
import { PORT, ADMIN_EMAIL, ADMIN_PASSWORD_HASH } from './config/env.js'
import { authService } from './auth/auth.service.js'

ADMIN_EMAIL && ADMIN_PASSWORD_HASH && authService.createAdmin(ADMIN_EMAIL, ADMIN_PASSWORD_HASH)

app.listen(PORT, () => console.log(`Server running on localhost:${PORT}`))