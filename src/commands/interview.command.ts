import { Command, CommandRunner, Option, Question, QuestionSet } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InquirerService } from 'nest-commander';
import * as fs from 'fs/promises';
import * as path from 'path';

import { AiService } from '../ai/ai.service';
import { Application } from '../database/entities/application.entity';

interface InterviewCommandOptions {
  id?: number;
}

@Command({
  name: 'interview',
  description: 'Generar paquete de preparación de entrevista y ejecutar un simulacro de entrevista interactivo',
})
export class InterviewCommand extends CommandRunner {
  private readonly logger = new Logger(InterviewCommand.name);

  constructor(
    private readonly aiService: AiService,
    private readonly inquirerService: InquirerService,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {
    super();
  }

  private sanitizeName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .trim()
      .replace(/[\s\-]+/g, '_')
      .replace(/_+/g, '_');
  }

  async run(inputs: string[], options: InterviewCommandOptions): Promise<void> {
    console.log('\n\x1b[36m===================================================');
    console.log('       PREPARACIÓN Y SIMULACRO DE ENTREVISTA       ');
    console.log('===================================================\x1b[0m');

    const id = options.id;
    if (id === undefined || id === null) {
      console.error('\x1b[31m[ERROR]: Debes ingresar el ID de la postulación usando el flag -i o --id.\x1b[0m');
      return;
    }

    try {
      // 1. OBTENER CONTEXTO DE LA POSTULACIÓN
      const app = await this.applicationRepository.findOne({
        where: { id },
        relations: { vacancy: true },
      });

      if (!app) {
        console.error(`\x1b[31m[ERROR]: No se encontró ninguna postulación con el ID ${id}.\x1b[0m\n`);
        return;
      }

      const sanitizedCompany = this.sanitizeName(app.vacancy.company);
      const sanitizedRole = this.sanitizeName(app.vacancy.role);
      const folderName = `${sanitizedCompany}_${sanitizedRole}`;
      const destinationDir = path.resolve('local_storage', 'applications', folderName);

      const cvPath = path.join(destinationDir, 'cv_draft.tex');
      const coverPath = path.join(destinationDir, 'cover_letter.tex');

      let cvContent = '';
      let coverLetterContent = '';

      try {
        cvContent = await fs.readFile(cvPath, 'utf-8');
      } catch {
        this.logger.warn(`No se encontró cv_draft.tex en ${cvPath}. Se procederá sin el código fuente del CV.`);
      }

      try {
        coverLetterContent = await fs.readFile(coverPath, 'utf-8');
      } catch {
        this.logger.warn(`No se encontró cover_letter.tex en ${coverPath}. Se procederá sin el código fuente de la carta.`);
      }

      // 2. SOLICITAR DETALLES DE LA ETAPA
      const stageAnswers = await this.inquirerService.ask<{ stage: string; interviewer: string }>(
        'interview-stage-questions',
        {},
      );

      // 3. GENERAR EL PREP PACK
      const stageDetails = `Etapa: ${stageAnswers.stage}${
        stageAnswers.interviewer ? ` | Entrevistador: ${stageAnswers.interviewer}` : ''
      }`;

      console.log('\n\x1b[33mGenerando paquete de preparación (Prep Pack) con Gemini...\x1b[0m');
      const prepPack = await this.aiService.generatePrepPack(
        app.vacancy,
        cvContent,
        coverLetterContent,
        stageDetails,
      );

      const sanitizedStage = this.sanitizeName(stageAnswers.stage).toLowerCase();
      const prepPackPath = path.join(destinationDir, `interview_prep_${sanitizedStage}.md`);

      await fs.mkdir(path.dirname(prepPackPath), { recursive: true });
      await fs.writeFile(prepPackPath, prepPack, 'utf-8');

      console.log('\n\x1b[32m===================================================');
      console.log('¡ÉXITO! Paquete de preparación guardado.');
      console.log(`Guardado en: ${prepPackPath}`);
      console.log('===================================================\x1b[0m\n');
      console.log(prepPack);
      console.log('\n\x1b[32m===================================================\x1b[0m\n');

      // 4. PREGUNTAR POR SIMULACRO DE ENTREVISTA INTERACTIVO
      const mockAnswers = await this.inquirerService.ask<{ startMock: boolean }>('interview-mock-confirm', {});

      if (!mockAnswers.startMock) {
        console.log('\n\x1b[36m===================================================');
        console.log('¡Buena suerte! Recuerda usar el comando de status para actualizar el resultado de tu entrevista.');
        console.log('===================================================\x1b[0m\n');
        return;
      }

      // 5. BUCLE DE INTERACCION DE CHAT (MOCK INTERVIEW)
      console.log('\n\x1b[33mIniciando el simulacro de entrevista... escribe "salir" para terminar.\x1b[0m');

      const systemInstruction = `Actúas como un entrevistador técnico o reclutador experimentado para la empresa ${app.vacancy.company}.
Estás entrevistando al candidato para el puesto de ${app.vacancy.role}.
Etapa de la entrevista: ${stageAnswers.stage}.
${stageAnswers.interviewer ? `Nombre del entrevistador: ${stageAnswers.interviewer}.` : ''}

INFORMACIÓN DEL CONTEXTO:
- Descripción de la Vacante:
${app.vacancy.description}
- CV del Candidato (Código LaTeX):
${cvContent}
- Carta de Presentación (Código LaTeX):
${coverLetterContent}

INSTRUCCIONES DE COMPORTAMIENTO:
1. Realiza una entrevista simulada realista, una pregunta a la vez. Espera la respuesta del candidato antes de pasar a la siguiente pregunta.
2. Inicia presentándote brevemente y haciendo la primera pregunta típica del puesto y la etapa.
3. Evalúa críticamente las respuestas del candidato, haz repreguntas si su respuesta es vaga o si quieres profundizar en un tema de su CV, tal como lo haría un entrevistador real.
4. Responde en el mismo idioma de los documentos (normalmente español).
5. Mantén tus intervenciones cortas y directas para simular un diálogo fluido en terminal.`;

      const chat = await this.aiService.startMockInterviewSession(systemInstruction);

      // Primer mensaje inicializador para que Gemini salude y comience
      const initResult = await chat.sendMessage('Hola, estoy listo para iniciar la entrevista simulada.');
      console.log(`\n\x1b[35m[Entrevistador]:\x1b[0m ${initResult.response.text()}\n`);

      while (true) {
        const chatAnswer = await this.inquirerService.ask<{ userResponse: string }>(
          'interview-chat-question',
          {},
        );

        const responseText = chatAnswer.userResponse.trim();

        if (responseText.toLowerCase() === 'salir') {
          console.log('\n\x1b[33mSimulacro de entrevista finalizado por el usuario.\x1b[0m');
          break;
        }

        console.log('\n\x1b[33mEnviando respuesta a Gemini...\x1b[0m');
        const chatResult = await chat.sendMessage(responseText);
        console.log(`\n\x1b[35m[Entrevistador]:\x1b[0m ${chatResult.response.text()}\n`);
      }

      console.log('\n\x1b[36m===================================================');
      console.log('¡Buena suerte! Recuerda usar el comando de status para actualizar el resultado de tu entrevista.');
      console.log('===================================================\x1b[0m\n');

    } catch (err) {
      this.logger.error(`Error durante la preparación de la entrevista: ${err.message}`);
    }
  }

  @Option({
    flags: '-i, --id <id>',
    description: 'ID de la postulación en la base de datos',
  })
  parseId(val: string): number {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      throw new Error('El ID de la postulación debe ser un número entero válido.');
    }
    return parsed;
  }
}

@QuestionSet({ name: 'interview-stage-questions' })
export class InterviewStageQuestions {
  @Question({
    type: 'input',
    name: 'stage',
    message: '¿Qué etapa de entrevista es? (Ej. Filtro telefónico, Técnica, Final):',
    validate: (val: string) => (val && val.trim().length > 0) || 'Debes especificar la etapa de la entrevista.',
  })
  parseStage(val: string) {
    return val;
  }

  @Question({
    type: 'input',
    name: 'interviewer',
    message: '¿Quién es el entrevistador? (Opcional, presiona Enter para omitir):',
  })
  parseInterviewer(val: string) {
    return val;
  }
}

@QuestionSet({ name: 'interview-mock-confirm' })
export class InterviewMockConfirm {
  @Question({
    type: 'confirm',
    name: 'startMock',
    message: '¿Deseas iniciar un simulacro de entrevista ahora mismo?',
    default: true,
  })
  parseStartMock(val: boolean) {
    return val;
  }
}

@QuestionSet({ name: 'interview-chat-question' })
export class InterviewChatQuestion {
  @Question({
    type: 'input',
    name: 'userResponse',
    message: 'Tú:',
    validate: (val: string) => (val && val.trim().length > 0) || 'Debes ingresar un mensaje (o escribe "salir" para terminar).',
  })
  parseUserResponse(val: string) {
    return val;
  }
}
