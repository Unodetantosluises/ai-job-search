import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../database/entities/application.entity';

@Command({
  name: 'list',
  description: 'Listar todas las postulaciones guardadas y realizadas con sus detalles',
})
export class ListCommand extends CommandRunner {
  private readonly logger = new Logger(ListCommand.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {
    super();
  }

  async run(): Promise<void> {
    console.log('\n\x1b[36m===================================================');
    console.log('            HISTORIAL DE POSTULACIONES              ');
    console.log('===================================================\x1b[0m');

    try {
      // Consultar todas las postulaciones con joins para vacancy y evaluation
      const applications = await this.applicationRepository.find({
        relations: {
          vacancy: true,
          evaluation: true,
        },
        order: {
          applied_at: 'DESC',
        },
      });

      if (applications.length === 0) {
        console.log('\n\x1b[33mEl historial de postulaciones está vacío.\x1b[0m');
        console.log('\x1b[36mUse "npm run cli -- scrape" o "npm run cli -- apply" para comenzar.\x1b[0m\n');
        return;
      }

      // Mapear los resultados en formato plano y legible
      const mappedData = applications.map((app) => {
        const dateStr = app.applied_at
          ? new Date(app.applied_at).toLocaleDateString('es-MX', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : 'N/A';

        return {
          ID: app.id,
          Empresa: app.vacancy?.company || 'Desconocida',
          Puesto: app.vacancy?.role || 'Desconocido',
          Modalidad: app.vacancy?.location_type || 'No especificada',
          Estado: app.status,
          Score: app.evaluation ? `${app.evaluation.score}/100` : 'N/A',
          Fecha: dateStr,
        };
      });

      // Imprimir tabla formateada
      console.table(mappedData);
      console.log(`\x1b[32mTotal: ${applications.length} postulaciones registradas.\x1b[0m\n`);

    } catch (err) {
      this.logger.error(`Error al listar el historial de postulaciones: ${err.message}`);
    }
  }
}
