import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Vacancy } from './vacancy.entity';
import { Evaluation } from './evaluation.entity';

export enum ApplicationStatus {
  EN_ESPERA = 'EN_ESPERA',
  ENVIADO = 'ENVIADO',
  ENTREVISTA = 'ENTREVISTA',
  RECHAZADO = 'RECHAZADO',
}

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Vacancy, (vacancy) => vacancy.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vacancy_id' })
  vacancy: Vacancy;

  @Column({
    type: 'varchar',
    default: ApplicationStatus.EN_ESPERA,
  })
  status: ApplicationStatus;

  @CreateDateColumn({ name: 'applied_at' })
  applied_at: Date;

  @OneToOne(() => Evaluation, (evaluation) => evaluation.application)
  evaluation: Evaluation;
}
