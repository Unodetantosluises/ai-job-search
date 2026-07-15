import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Vacancy } from '../database/entities/vacancy.entity';
export declare class AiService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private genAI;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    private loadSystemPrompt;
    private loadTemplate;
    evaluateFit(vacancyDescription: string, candidateProfile?: string, language?: string): Promise<{
        score: number;
        analysis: string;
    }>;
    draftLatex(vacancyDescription: string, candidateProfile: string | undefined, templateType: 'cv' | 'cover_letter', language?: string): Promise<string>;
    buildCandidateProfile(rawText: string): Promise<string>;
    generatePrepPack(vacancy: Vacancy, cvContent: string, coverLetterContent: string, stageDetails: string): Promise<string>;
    startMockInterviewSession(systemInstruction: string): Promise<import("@google/generative-ai").ChatSession>;
}
