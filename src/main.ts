import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

// Cargar variables de entorno desde el archivo .env si existe
dotenv.config();

async function bootstrap() {
  await CommandFactory.run(AppModule, ['log', 'error', 'warn']);
}

bootstrap();
