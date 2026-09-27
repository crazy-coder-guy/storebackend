import http from 'http';
import app from './app';
import { config } from './config';
import { connectDatabase } from './database';
import { initRealtime } from './realtime/socket';

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

async function bootstrap() {
  await connectDatabase();

  const httpServer = http.createServer(app);
  initRealtime(httpServer);

  httpServer.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });
}

bootstrap();
