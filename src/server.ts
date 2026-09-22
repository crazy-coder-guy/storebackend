import app from './app';
import { config } from './config';
import { connectDatabase } from './database';

async function bootstrap() {
  await connectDatabase();

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
  });
}

bootstrap();
