import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Application } from './application.entity';

@Entity('vacancies')
export class Vacancy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  company: string;

  @Column({ type: 'varchar' })
  role: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  location_type: string;

  @Column({ type: 'varchar', nullable: true })
  url: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @OneToMany(() => Application, (application) => application.vacancy)
  applications: Application[];
}
