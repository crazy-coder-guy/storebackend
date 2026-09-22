import { Router } from 'express';
import categoryRoutes from './category.routes';
import colorRoutes from './color.routes';
import customerRoutes from './customer.routes';
import dashboardRoutes from './dashboard.routes';
import healthRoutes from './health.routes';
import inventoryRoutes from './inventory.routes';
import orderRoutes from './order.routes';
import productRoutes from './product.routes';
import sizeRoutes from './size.routes';

const router = Router();

router.use('/health', healthRoutes);

const v1 = Router();
v1.use('/categories', categoryRoutes);
v1.use('/products', productRoutes);
v1.use('/sizes', sizeRoutes);
v1.use('/colors', colorRoutes);
v1.use('/inventory', inventoryRoutes);
v1.use('/dashboard', dashboardRoutes);
v1.use('/orders', orderRoutes);
v1.use('/customers', customerRoutes);

router.use('/v1', v1);

export default router;
