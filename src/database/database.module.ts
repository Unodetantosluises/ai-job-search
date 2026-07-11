import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vacancy } from './entities/vacancy.entity';
import { Application } from './entities/application.entity';
import { Evaluation } from './entities/evaluation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vacancy, Application, Evaluation]),
  ],
  exports: [
    TypeOrmModule,
  ],
})
export class DatabaseModule {}
