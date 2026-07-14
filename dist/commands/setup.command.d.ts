import { CommandRunner } from 'nest-commander';
import { AiService } from '../ai/ai.service';
export declare class SetupCommand extends CommandRunner {
    private readonly aiService;
    private readonly logger;
    constructor(aiService: AiService);
    run(): Promise<void>;
}
