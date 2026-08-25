import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import clientRoutes from './client.routes.js';

const router = Router();

router.use('/admin', adminRoutes);
router.use('/client', clientRoutes);

export default router;
