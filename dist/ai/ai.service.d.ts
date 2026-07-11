import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class AiService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private genAI;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    private loadSystemPrompt;
    private loadTemplate;
    evaluateFit(vacancyDescription: string, candidateProfile: string, language?: string): Promise<{
        score: number;
        analysis: string;
    }>;
    draftLatex(vacancyDescription: string, candidateProfile: string, templateType: 'cv' | 'cover_letter', language?: string): Promise<string>;
}
