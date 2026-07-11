import { Application } from './application.entity';
export declare class Vacancy {
    id: number;
    company: string;
    role: string;
    description: string;
    location_type: string;
    url: string;
    country: string;
    created_at: Date;
    applications: Application[];
}
