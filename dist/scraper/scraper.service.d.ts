import { Vacancy } from '../database/entities/vacancy.entity';
export declare class ScraperService {
    private readonly logger;
    private launchBrowser;
    private getTextContent;
    extractVacancyData(url: string): Promise<Partial<Vacancy>>;
}
