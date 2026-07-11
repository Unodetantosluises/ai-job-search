export declare class StorageService {
    private readonly logger;
    private readonly storageRoot;
    private sanitizeName;
    saveApplicationFiles(company: string, role: string, cvPath: string, coverLetterPath: string): Promise<{
        cvDest: string;
        coverLetterDest: string;
    }>;
}
