import { Module } from '@nestjs/common';
import { LatexService } from './latex.service';

@Module({
  providers: [LatexService],
  exports: [LatexService],
})
export class LatexModule {}
