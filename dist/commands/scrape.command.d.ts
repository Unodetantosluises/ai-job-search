import { CommandRunner } from 'nest-commander';
import { Repository } from 'typeorm';
import { InquirerService } from 'nest-commander';
import { ScraperService } from '../scraper/scraper.service';
import { AiService } from '../ai/ai.service';
import { LatexService } from '../latex/latex.service';
import { StorageService } from '../storage/storage.service';
import { Vacancy } from '../database/entities/vacancy.entity';
import { Application } from '../database/entities/application.entity';
import { Evaluation } from '../database/entities/evaluation.entity';
interface ScrapeCommandOptions {
    url?: string;
}
export declare class ScrapeCommand extends CommandRunner {
    private readonly scraperService;
    private readonly inquirerService;
    private readonly aiService;
    private readonly latexService;
    private readonly storageService;
    private readonly vacancyRepository;
    private readonly applicationRepository;
    private readonly evaluationRepository;
    private readonly logger;
    constructor(scraperService: ScraperService, inquirerService: InquirerService, aiService: AiService, latexService: LatexService, storageService: StorageService, vacancyRepository: Repository<Vacancy>, applicationRepository: Repository<Application>, evaluationRepository: Repository<Evaluation>);
    run(inputs: string[], options: ScrapeCommandOptions): Promise<void>;
    parseUrl(val: string): string;
}
export declare class ScrapeConfirmQuestions {
    parseEvaluate(val: boolean): boolean;
}
export {};
