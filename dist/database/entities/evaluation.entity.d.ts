import { Application } from './application.entity';
export declare class Evaluation {
    id: number;
    application: Application;
    score: number;
    fit_analysis: string;
    created_at: Date;
}
