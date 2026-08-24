import { CommandRunner, InquirerService } from 'nest-commander';
import { AiService } from '../ai/ai.service';
export declare class SetupCommand extends CommandRunner {
    private readonly aiService;
    private readonly inquirerService;
    private readonly logger;
    private readonly skillsDir;
    constructor(aiService: AiService, inquirerService: InquirerService);
    run(): Promise<void>;
    private runDocumentPhase;
    private runBehavioralPhase;
    private runCareerGoalsPhase;
}
export declare class SetupConfirmQuestion {
    parseRunInteractive(val: boolean): boolean;
}
export declare class SetupOverwriteConfirmQuestion {
    parseOverwrite(val: boolean): boolean;
}
export declare class SetupBehavioralQuestions {
    parseProblemSolving(val: string): string;
    parseMultitasking(val: string): string;
    parseProjectPhase(val: string): string;
    parseTeamRole(val: string): string;
    parseEnergySource(val: string): string;
    parseWorkEnvironment(val: string): string;
    parseChangeReaction(val: string): string;
    parseManagerStyle(val: string): string;
    parseDrainTasks(val: string): string;
    parseDeliveryQuality(val: string): string;
    parseGrowthAreas(val: string): string;
    parsePresentationsComfort(val: string): string;
    parseFailureReaction(val: string): string;
    parsePeerPerception(val: string): string;
}
export declare class SetupCareerQuestions {
    parseShortTermGoal(val: string): string;
    parseLongTermGoal(val: string): string;
    parseLearningGoal(val: string): string;
    parseEnergizingWork(val: string): string;
    parseDrainingWork(val: string): string;
}
