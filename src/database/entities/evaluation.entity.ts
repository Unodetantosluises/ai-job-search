import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Application } from './application.entity';

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Application, (application) => application.evaluation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ type: 'integer' })
  score: number;

  @Column({ type: 'text' })
  fit_analysis: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
