import { CommandRunner } from 'nest-commander';
import { Repository } from 'typeorm';
import { Application } from '../database/entities/application.entity';
export declare class ListCommand extends CommandRunner {
    private readonly applicationRepository;
    private readonly logger;
    constructor(applicationRepository: Repository<Application>);
    run(): Promise<void>;
}
