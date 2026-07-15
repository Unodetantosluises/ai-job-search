import { CommandRunner } from 'nest-commander';
import { Repository } from 'typeorm';
import { Application } from '../database/entities/application.entity';
interface StatusCommandOptions {
    id?: number;
    status?: string;
}
export declare class StatusCommand extends CommandRunner {
    private readonly applicationRepository;
    private readonly logger;
    constructor(applicationRepository: Repository<Application>);
    run(inputs: string[], options: StatusCommandOptions): Promise<void>;
    parseId(val: string): number;
    parseStatus(val: string): string;
}
export {};
