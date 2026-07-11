export declare class LatexService {
    private readonly logger;
    private readonly dockerImageName;
    private handleDockerError;
    checkDockerImage(): Promise<boolean>;
    buildDockerImage(): Promise<void>;
    compilePdf(filePath: string, engine?: 'lualatex' | 'xelatex'): Promise<void>;
    private cleanupAuxFiles;
}
