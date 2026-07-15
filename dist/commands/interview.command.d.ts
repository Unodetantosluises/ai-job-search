import { CommandRunner } from 'nest-commander';
import { Repository } from 'typeorm';
import { InquirerService } from 'nest-commander';
import { AiService } from '../ai/ai.service';
import { Application } from '../database/entities/application.entity';
interface InterviewCommandOptions {
    id?: number;
}
export declare class InterviewCommand extends CommandRunner {
    private readonly aiService;
    private readonly inquirerService;
    private readonly applicationRepository;
    private readonly logger;
    constructor(aiService: AiService, inquirerService: InquirerService, applicationRepository: Repository<Application>);
    private sanitizeName;
    run(inputs: string[], options: InterviewCommandOptions): Promise<void>;
    parseId(val: string): number;
}
export declare class InterviewStageQuestions {
    parseStage(val: string): string;
    parseInterviewer(val: string): string;
}
export declare class InterviewMockConfirm {
    parseStartMock(val: boolean): boolean;
}
export declare class InterviewChatQuestion {
    parseUserResponse(val: string): string;
}
export {};
