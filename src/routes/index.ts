import { Router } from 'express';
import addressRoutes from './address.routes';
import cartRoutes from './cart.routes';
import categoryRoutes from './category.routes';
import colorRoutes from './color.routes';
import customerRoutes from './customer.routes';
import dashboardRoutes from './dashboard.routes';
import favoriteRoutes from './favorite.routes';
import healthRoutes from './health.routes';
import inventoryRoutes from './inventory.routes';
import orderRoutes from './order.routes';
import productRoutes from './product.routes';
import pushRoutes from './push.routes';
import reviewsAdminRoutes from './reviewsAdmin.routes';
import searchRoutes from './search.routes';
import sizeRoutes from './size.routes';
import storefrontRoutes from './storefront.routes';

const router = Router();

router.use('/health', healthRoutes);

const v1 = Router();
v1.use('/categories', categoryRoutes);
v1.use('/products', productRoutes);
v1.use('/sizes', sizeRoutes);
v1.use('/colors', colorRoutes);
v1.use('/inventory', inventoryRoutes);
v1.use('/dashboard', dashboardRoutes);
v1.use('/storefront', storefrontRoutes);
v1.use('/search', searchRoutes);
v1.use('/orders', orderRoutes);
v1.use('/customers', customerRoutes);
v1.use('/cart', cartRoutes);
v1.use('/favorites', favoriteRoutes);
v1.use('/push', pushRoutes);
v1.use('/addresses', addressRoutes);
v1.use('/reviews', reviewsAdminRoutes);

router.use('/v1', v1);

export default router;
