import { Command, CommandRunner, Option, InquirerService, QuestionSet, Question } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vacancy } from '../database/entities/vacancy.entity';
import { Application, ApplicationStatus } from '../database/entities/application.entity';
import { Evaluation } from '../database/entities/evaluation.entity';
import { AiService } from '../ai/ai.service';
import { LatexService } from '../latex/latex.service';
import { StorageService } from '../storage/storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';

interface ApplyCommandOptions {
  company?: string;
  role?: string;
  description?: string;
  language?: string;
  country?: string;
}

@Command({
  name: 'apply',
  description: 'Proceso completo para evaluar y aplicar a una vacante generando CV y carta de presentación',
})
export class ApplyCommand extends CommandRunner {
  private readonly logger = new Logger(ApplyCommand.name);

  constructor(
    private readonly inquirerService: InquirerService,
    private readonly aiService: AiService,
    private readonly latexService: LatexService,
    private readonly storageService: StorageService,
    @InjectRepository(Vacancy)
    private readonly vacancyRepository: Repository<Vacancy>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
  ) {
    super();
  }

  async run(inputs: string[], options: ApplyCommandOptions): Promise<void> {
    console.log('\n\x1b[36m===================================================');
    console.log('       INICIANDO PROCESO DE POSTULACIÓN (APPLY)       ');
    console.log('===================================================\x1b[0m');

    let company = options.company;
    let role = options.role;
    let description = options.description;
    const language = options.language || 'Español';
    const country = options.country || 'No especificado';

    // Preguntar por consola lo que falte
    if (!company || !role || !description) {
      this.logger.log('Solicitando datos requeridos mediante interfaz interactiva...');
      const answers = await this.inquirerService.ask<ApplyCommandOptions>('apply-questions', options);
      company = answers.company || company;
      role = answers.role || role;
      description = answers.description || description;
    }

    if (!company || !role || !description) {
      console.error('\x1b[31m[ERROR]: Faltan argumentos mandatorios (empresa, rol o descripción).\x1b[0m');
      return;
    }

    // Resolver si la descripción es una ruta de archivo
    let descriptionText = description;
    try {
      await fs.access(description);
      this.logger.log(`Leyendo descripción de vacante desde archivo: ${description}`);
      descriptionText = await fs.readFile(description, 'utf-8');
    } catch {
      // Usar el texto tal cual
    }

    let savedVacancy: Vacancy;
    let savedApplication: Application;
    let cvLatex = '';
    let coverLatex = '';

    try {
      // 1. REGISTRO INICIAL (La Memoria)
      this.logger.log('Guardando vacante y postulacion inicial en la base de datos...');
      const vacancy = new Vacancy();
      vacancy.company = company;
      vacancy.role = role;
      vacancy.description = descriptionText;
      vacancy.location_type = 'No especificado';
      vacancy.url = 'No especificada';
      vacancy.country = country;
      savedVacancy = await this.vacancyRepository.save(vacancy);

      const application = new Application();
      application.vacancy = savedVacancy;
      application.status = ApplicationStatus.EN_ESPERA;
      savedApplication = await this.applicationRepository.save(application);

      // 2. EVALUACIÓN DE IA (El Cerebro)
      console.log('\n\x1b[33m[1/4] Analizando perfil del candidato contra la vacante...\x1b[0m');
      
      const profilePath = path.join(
        process.cwd(),
        'docs_prompts',
        'skills',
        'job-application-assistant',
        '01-candidate-profile.md',
      );
      
      let candidateProfile = '';
      try {
        candidateProfile = await fs.readFile(profilePath, 'utf-8');
      } catch (err) {
        this.logger.warn(`No se pudo leer el perfil de 01-candidate-profile.md. Se usará un perfil vacío. Detalle: ${err.message}`);
      }

      const fitResult = await this.aiService.evaluateFit(descriptionText, candidateProfile, language);
      
      // Guardar la evaluación
      const evaluation = new Evaluation();
      evaluation.application = savedApplication;
      evaluation.score = fitResult.score;
      evaluation.fit_analysis = fitResult.analysis;
      await this.evaluationRepository.save(evaluation);

      console.log('\n\x1b[32m--- RESULTADO DE EVALUACIÓN ---');
      console.log(`PUNTACIÓN DE AJUSTE (FIT): ${fitResult.score}/100`);
      console.log('ANÁLISIS CUALITATIVO:');
      console.log(fitResult.analysis);
      console.log('-------------------------------\x1b[0m');

      // 3. CONFIRMACIÓN INTERACTIVA (Umbral de Score)
      if (fitResult.score < 75) {
        console.log('\n\x1b[33m[ADVERTENCIA]: El nivel de fit con la vacante es menor a 75/100.\x1b[0m');
        const confirm = await this.inquirerService.ask<{ continue: boolean }>('confirm-questions', {});
        
        if (!confirm.continue) {
          savedApplication.status = ApplicationStatus.RECHAZADO;
          await this.applicationRepository.save(savedApplication);
          console.log('\n\x1b[31m[CANCELADO]: Postulación marcada como RECHAZADA. Proceso terminado.\x1b[0m');
          console.log('\x1b[36m===================================================\x1b[0m');
          return;
        }
      }

      // 4. REDACCIÓN Y COMPILACIÓN (El Cerebro y El Motor)
      console.log('\n\x1b[33m[2/4] Redactando CV y Carta de Presentación adaptados con Gemini...\x1b[0m');
      
      const [cvRes, coverRes] = await Promise.all([
        this.aiService.draftLatex(descriptionText, candidateProfile, 'cv', language),
        this.aiService.draftLatex(descriptionText, candidateProfile, 'cover_letter', language),
      ]);
      cvLatex = cvRes;
      coverLatex = coverRes;

      const tempCvPath = path.resolve('cv', 'temp_cv.tex');
      const tempCoverPath = path.resolve('cover_letters', 'temp_cover.tex');

      await fs.writeFile(tempCvPath, cvLatex, 'utf-8');
      await fs.writeFile(tempCoverPath, coverLatex, 'utf-8');

      console.log('\n\x1b[33m[3/4] Compilando documentos LaTeX a PDF mediante Docker (XeTeX/LuaTeX)...\x1b[0m');
      
      await Promise.all([
        this.latexService.compilePdf(tempCvPath, 'xelatex'),
        this.latexService.compilePdf(tempCoverPath, 'xelatex'),
      ]);

      // 5. ARCHIVO FINAL (La Memoria y Storage)
      console.log('\n\x1b[33m[4/4] Moviendo PDFs al almacenamiento local y limpiando temporales...\x1b[0m');
      
      const tempCvPdf = path.resolve('cv', 'temp_cv.pdf');
      const tempCoverPdf = path.resolve('cover_letters', 'temp_cover.pdf');

      const { cvDest, coverLetterDest } = await this.storageService.saveApplicationFiles(
        company,
        role,
        tempCvPdf,
        tempCoverPdf,
      );

      // Eliminar archivos .tex y .pdf temporales de sus respectivas carpetas
      await fs.unlink(tempCvPath).catch(() => {});
      await fs.unlink(tempCoverPath).catch(() => {});
      await fs.unlink(tempCvPdf).catch(() => {});
      await fs.unlink(tempCoverPdf).catch(() => {});

      // Actualizar estado final de la postulación
      savedApplication.status = ApplicationStatus.ENVIADO;
      await this.applicationRepository.save(savedApplication);

      console.log('\n\x1b[32m===================================================');
      console.log('¡ÉXITO! Documentos de postulación creados con éxito.');
      console.log('===================================================');
      console.log(`Carpeta destino:\n  ${path.dirname(cvDest)}`);
      console.log(`- CV Guardado: ${path.basename(cvDest)}`);
      console.log(`- Carta Guardada: ${path.basename(coverLetterDest)}`);
      console.log('Estado de la postulación en Base de Datos: ENVIADO');
      console.log('===================================================\x1b[0m\n');

    } catch (error) {
      console.error('\n\x1b[31m[ERROR DURANTE LA OPERACIÓN]:', error.message, '\x1b[0m');
      
      // Imprimir preámbulos para depuración
      if (typeof cvLatex === 'string') {
        console.log('\n\x1b[33m--- PREÁMBULO CV GENERADO (DEPURACIÓN) ---');
        console.log(cvLatex.substring(0, 600));
        console.log('-------------------------------------------\x1b[0m');
      }
      if (typeof coverLatex === 'string') {
        console.log('\n\x1b[33m--- PREÁMBULO CARTA GENERADA (DEPURACIÓN) ---');
        console.log(coverLatex.substring(0, 600));
        console.log('-------------------------------------------\x1b[0m');
      }

      if (savedApplication) {
        try {
          // Registrar error si falla a medio camino
          savedApplication.status = 'ERROR' as any;
          await this.applicationRepository.save(savedApplication);
          this.logger.log('Estado de postulación actualizado a: ERROR');
        } catch (dbErr) {
          this.logger.error(`No se pudo actualizar el estado de error en la base de datos: ${dbErr.message}`);
        }
      }
      
      // Intentar limpiar archivos si quedaron creados
      await fs.unlink(path.resolve('cv', 'temp_cv.tex')).catch(() => {});
      await fs.unlink(path.resolve('cover_letters', 'temp_cover.tex')).catch(() => {});
      await fs.unlink(path.resolve('cv', 'temp_cv.pdf')).catch(() => {});
      await fs.unlink(path.resolve('cover_letters', 'temp_cover.pdf')).catch(() => {});
    }
  }

  @Option({
    flags: '-c, --company <company>',
    description: 'Nombre de la empresa a la que aplicas',
  })
  parseCompany(val: string) {
    return val;
  }

  @Option({
    flags: '-r, --role <role>',
    description: 'Nombre del puesto o rol vacante',
  })
  parseRole(val: string) {
    return val;
  }

  @Option({
    flags: '-d, --description <description>',
    description: 'Descripción de la vacante (copia el texto o escribe la ruta de un archivo local)',
  })
  parseDescription(val: string) {
    return val;
  }

  @Option({
    flags: '-l, --language [language]',
    description: 'Idioma para la postulación y evaluación',
    defaultValue: 'Español',
  })
  parseLanguage(val: string) {
    return val;
  }

  @Option({
    flags: '-ct, --country [country]',
    description: 'País de la vacante',
    defaultValue: 'No especificado',
  })
  parseCountry(val: string) {
    return val;
  }
}

@QuestionSet({ name: 'apply-questions' })
export class ApplyQuestions {
  @Question({
    type: 'input',
    name: 'company',
    message: 'Nombre de la empresa:',
    validate: (val: string) => (val ? true : 'El nombre de la empresa es obligatorio.'),
  })
  parseCompany(val: string) {
    return val;
  }

  @Question({
    type: 'input',
    name: 'role',
    message: 'Rol o puesto de la vacante:',
    validate: (val: string) => (val ? true : 'El rol de la vacante es obligatorio.'),
  })
  parseRole(val: string) {
    return val;
  }

  @Question({
    type: 'input',
    name: 'description',
    message: 'Descripción de la vacante (texto o ruta de un archivo de texto):',
    validate: (val: string) => (val ? true : 'La descripción de la vacante es obligatoria.'),
  })
  parseDescription(val: string) {
    return val;
  }
}

@QuestionSet({ name: 'confirm-questions' })
export class ConfirmQuestions {
  @Question({
    type: 'confirm',
    name: 'continue',
    message: 'El nivel de fit es bajo. ¿Deseas continuar gastando tokens para generar los PDFs?',
    default: false,
  })
  parseContinue(val: boolean) {
    return val;
  }
}
