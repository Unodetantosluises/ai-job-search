import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplyCommand, ApplyQuestions, ConfirmQuestions } from './apply.command';
import { SetupCommand } from './setup.command';
import { AiModule } from '../ai/ai.module';
import { LatexModule } from '../latex/latex.module';
import { StorageModule } from '../storage/storage.module';
import { Vacancy } from '../database/entities/vacancy.entity';
import { Application } from '../database/entities/application.entity';
import { Evaluation } from '../database/entities/evaluation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vacancy, Application, Evaluation]),
    AiModule,
    LatexModule,
    StorageModule,
  ],
  providers: [
    ApplyCommand,
    ApplyQuestions,
    ConfirmQuestions,
    SetupCommand,
  ],
})
export class CommandsModule {}
