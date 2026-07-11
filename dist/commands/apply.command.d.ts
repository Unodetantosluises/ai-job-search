import { CommandRunner, InquirerService } from 'nest-commander';
import { Repository } from 'typeorm';
import { Vacancy } from '../database/entities/vacancy.entity';
import { Application } from '../database/entities/application.entity';
import { Evaluation } from '../database/entities/evaluation.entity';
import { AiService } from '../ai/ai.service';
import { LatexService } from '../latex/latex.service';
import { StorageService } from '../storage/storage.service';
interface ApplyCommandOptions {
    company?: string;
    role?: string;
    description?: string;
    language?: string;
    country?: string;
}
export declare class ApplyCommand extends CommandRunner {
    private readonly inquirerService;
    private readonly aiService;
    private readonly latexService;
    private readonly storageService;
    private readonly vacancyRepository;
    private readonly applicationRepository;
    private readonly evaluationRepository;
    private readonly logger;
    constructor(inquirerService: InquirerService, aiService: AiService, latexService: LatexService, storageService: StorageService, vacancyRepository: Repository<Vacancy>, applicationRepository: Repository<Application>, evaluationRepository: Repository<Evaluation>);
    run(inputs: string[], options: ApplyCommandOptions): Promise<void>;
    parseCompany(val: string): string;
    parseRole(val: string): string;
    parseDescription(val: string): string;
    parseLanguage(val: string): string;
    parseCountry(val: string): string;
}
export declare class ApplyQuestions {
    parseCompany(val: string): string;
    parseRole(val: string): string;
    parseDescription(val: string): string;
}
export declare class ConfirmQuestions {
    parseContinue(val: boolean): boolean;
}
export {};
