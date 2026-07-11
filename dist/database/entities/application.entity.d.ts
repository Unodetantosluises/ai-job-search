import { Vacancy } from './vacancy.entity';
import { Evaluation } from './evaluation.entity';
export declare enum ApplicationStatus {
    EN_ESPERA = "EN_ESPERA",
    ENVIADO = "ENVIADO",
    ENTREVISTA = "ENTREVISTA",
    RECHAZADO = "RECHAZADO"
}
export declare class Application {
    id: number;
    vacancy: Vacancy;
    status: ApplicationStatus;
    applied_at: Date;
    evaluation: Evaluation;
}
