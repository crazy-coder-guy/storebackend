import { apiReference } from '@scalar/express-api-reference';
import cors from 'cors';
import express, { Application } from 'express';
import { openApiSpec } from './config/openapi';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.get('/openapi.json', (_req, res) => res.json(openApiSpec));
app.use(
  '/docs',
  apiReference({
    spec: { url: '/openapi.json' },
  })
);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
