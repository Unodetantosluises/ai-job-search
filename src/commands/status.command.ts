import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStatus } from '../database/entities/application.entity';

interface StatusCommandOptions {
  id?: number;
  status?: string;
}

@Command({
  name: 'status',
  description: 'Actualizar el estado de una postulación en la base de datos por su ID',
})
export class StatusCommand extends CommandRunner {
  private readonly logger = new Logger(StatusCommand.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {
    super();
  }

  async run(inputs: string[], options: StatusCommandOptions): Promise<void> {
    console.log('\n\x1b[36m===================================================');
    console.log('         ACTUALIZAR ESTADO DE POSTULACIÓN          ');
    console.log('===================================================\x1b[0m');

    const id = options.id;
    const rawStatus = options.status;

    if (id === undefined || id === null) {
      console.error('\x1b[31m[ERROR]: Debes ingresar el ID de la postulación usando el flag -i o --id.\x1b[0m');
      return;
    }

    if (!rawStatus) {
      console.error('\x1b[31m[ERROR]: Debes ingresar el nuevo estado usando el flag -s o --status.\x1b[0m');
      return;
    }

    // Normalizar a mayúsculas y limpiar espacios
    const newStatus = rawStatus.trim().toUpperCase();

    // Validar estados permitidos
    const validStatuses = ['EN_ESPERA', 'ENVIADO', 'ENTREVISTA', 'RECHAZADO'];
    if (!validStatuses.includes(newStatus)) {
      console.error(`\x1b[31m[ERROR]: El estado "${rawStatus}" no es válido.\x1b[0m`);
      console.log('\x1b[33mEstados válidos permitidos:\x1b[0m');
      console.log('  - EN_ESPERA');
      console.log('  - ENVIADO');
      console.log('  - ENTREVISTA');
      console.log('  - RECHAZADO\n');
      return;
    }

    try {
      // Buscar la postulación por ID con su vacante asociada
      const app = await this.applicationRepository.findOne({
        where: { id },
        relations: { vacancy: true },
      });

      if (!app) {
        console.error(`\x1b[31m[ERROR]: No se encontró ninguna postulación con el ID ${id}.\x1b[0m\n`);
        return;
      }

      const oldStatus = app.status;
      app.status = newStatus as ApplicationStatus;
      await this.applicationRepository.save(app);

      console.log('\n\x1b[32m===================================================');
      console.log('¡ÉXITO! Estado de postulación actualizado.');
      console.log(`Empresa:      ${app.vacancy?.company || 'Desconocida'}`);
      console.log(`Puesto:       ${app.vacancy?.role || 'Desconocido'}`);
      console.log(`Estado viejo: ${oldStatus}`);
      console.log(`Estado nuevo: ${newStatus}`);
      console.log('===================================================\x1b[0m\n');

    } catch (err) {
      this.logger.error(`Error al actualizar el estado de la postulación: ${err.message}`);
    }
  }

  @Option({
    flags: '-i, --id <id>',
    description: 'ID de la postulación a modificar',
  })
  parseId(val: string): number {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      throw new Error('El ID de la postulación debe ser un número entero válido.');
    }
    return parsed;
  }

  @Option({
    flags: '-s, --status <status>',
    description: 'Nuevo estado a asignar (EN_ESPERA, ENVIADO, ENTREVISTA, RECHAZADO)',
  })
  parseStatus(val: string): string {
    return val;
  }
}
