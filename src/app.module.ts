import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestCommand } from './test.command';
import { LatexModule } from './latex/latex.module';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';
import { CommandsModule } from './commands/commands.module';
import { ScraperModule } from './scraper/scraper.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'job_search.sqlite',
      autoLoadEntities: true,
      synchronize: true,
    }),
    DatabaseModule,
    LatexModule,
    StorageModule,
    AiModule,
    CommandsModule,
    ScraperModule,
  ],
  providers: [TestCommand],
})
export class AppModule {}
