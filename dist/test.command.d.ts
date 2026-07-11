import { CommandRunner } from 'nest-commander';
import { LatexService } from './latex/latex.service';
import { StorageService } from './storage/storage.service';
import { AiService } from './ai/ai.service';
import { Repository } from 'typeorm';
import { Vacancy } from './database/entities/vacancy.entity';
import { Application } from './database/entities/application.entity';
import { Evaluation } from './database/entities/evaluation.entity';
export declare class TestCommand extends CommandRunner {
    private readonly latexService;
    private readonly storageService;
    private readonly aiService;
    private readonly vacancyRepository;
    private readonly applicationRepository;
    private readonly evaluationRepository;
    constructor(latexService: LatexService, storageService: StorageService, aiService: AiService, vacancyRepository: Repository<Vacancy>, applicationRepository: Repository<Application>, evaluationRepository: Repository<Evaluation>);
    run(inputs: string[], options: Record<string, any>): Promise<void>;
}
