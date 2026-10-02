import { apiReference } from '@scalar/express-api-reference';
import cors from 'cors';
import express, { Application } from 'express';
import { openApiSpec } from './config/openapi';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app: Application = express();

app.set('trust proxy', true);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // The exact bytes of the request body, captured below — Razorpay's
      // webhook signature is computed over the raw payload, and re-serializing
      // the already-parsed `req.body` back to JSON is not guaranteed to
      // produce byte-identical output (key order, whitespace), which would
      // make a valid webhook fail signature verification.
      rawBody?: Buffer;
    }
  }
}

app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  })
);
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
