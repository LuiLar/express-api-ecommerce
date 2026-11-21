import { Router } from "express";
import { ordersController } from "./orders.controller.js";
import { contentTypeValidator } from "../middleware/contentTypeValidator.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const ordersRouter = Router()

ordersRouter.get('/stats', auth, requireRole('admin'), ordersController.stats)
ordersRouter.get('/', auth, requireRole('customer'), ordersController.list)
ordersRouter.post('/', contentTypeValidator, auth, requireRole('customer'), ordersController.create)