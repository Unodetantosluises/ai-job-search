import { Command, CommandRunner, Option, Question, QuestionSet } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InquirerService } from 'nest-commander';
import * as fs from 'fs/promises';
import * as path from 'path';

import { ScraperService } from '../scraper/scraper.service';
import { AiService } from '../ai/ai.service';
import { LatexService } from '../latex/latex.service';
import { StorageService } from '../storage/storage.service';

import { Vacancy } from '../database/entities/vacancy.entity';
import { Application, ApplicationStatus } from '../database/entities/application.entity';
import { Evaluation } from '../database/entities/evaluation.entity';

interface ScrapeCommandOptions {
  url?: string;
}

@Command({
  name: 'scrape',
  description: 'Extraer datos de una vacante directamente a la base de datos por URL y dar opción a postularse',
})
export class ScrapeCommand extends CommandRunner {
  private readonly logger = new Logger(ScrapeCommand.name);

  constructor(
    private readonly scraperService: ScraperService,
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

  async run(inputs: string[], options: ScrapeCommandOptions): Promise<void> {
    console.log('\n\x1b[36m===================================================');
    console.log('       INICIANDO PROCESO DE SCRAPING DE VACANTE       ');
    console.log('===================================================\x1b[0m');

    const url = options.url;
    if (!url) {
      console.error('\x1b[31m[ERROR]: Debes proporcionar la URL de la vacante con el flag -u o --url.\x1b[0m');
      return;
    }

    let savedVacancy: Vacancy;
    let savedApplication: Application;
    let cvLatex = '';
    let coverLatex = '';

    try {
      // 1. EXTRAER INFORMACIÓN (Playwright Scraper)
      this.logger.log(`Iniciando extracción de datos para la URL: ${url}`);
      const scrapedData = await this.scraperService.extractVacancyData(url);

      // 2. GUARDAR EN LA BASE DE DATOS (Trazabilidad y persistencia)
      this.logger.log('Guardando vacante extraída en la base de datos...');
      const vacancy = new Vacancy();
      vacancy.company = scrapedData.company || 'Empresa Desconocida';
      vacancy.role = scrapedData.role || 'Puesto Desconocido';
      vacancy.description = scrapedData.description || '';
      vacancy.location_type = scrapedData.location_type || 'No especificado';
      vacancy.url = url;
      vacancy.country = 'No especificado'; // Campo por defecto para el scraper
      savedVacancy = await this.vacancyRepository.save(vacancy);

      this.logger.log('Creando registro de postulación vinculada en estado EN_ESPERA...');
      const application = new Application();
      application.vacancy = savedVacancy;
      application.status = ApplicationStatus.EN_ESPERA;
      savedApplication = await this.applicationRepository.save(application);

      console.log('\n\x1b[32m===================================================');
      console.log('¡ÉXITO! Vacante extraída y guardada correctamente.');
      console.log(`Empresa:   ${savedVacancy.company}`);
      console.log(`Puesto:    ${savedVacancy.role}`);
      console.log(`Modalidad: ${savedVacancy.location_type}`);
      console.log(`Estado:    EN_ESPERA`);
      console.log('===================================================\x1b[0m\n');

      // 3. PUENTE INTERACTIVO (Scrape -> Apply)
      const answers = await this.inquirerService.ask<{ evaluate: boolean }>('scrape-confirm-questions', {});

      if (!answers.evaluate) {
        this.logger.log('Flujo terminado. La vacante queda guardada en estado EN_ESPERA para postulación posterior.');
        return;
      }

      // 4. FLUJO DE EVALUACIÓN Y POSTULACIÓN (REUTILIZADO)
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

      // Evaluar fit en español por defecto
      const fitResult = await this.aiService.evaluateFit(savedVacancy.description, candidateProfile, 'Español');

      // Guardar la evaluación vinculada
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

      // Validar umbral de fit (< 75)
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

      // Redacción de LaTeX
      console.log('\n\x1b[33m[2/4] Redactando CV y Carta de Presentación adaptados con Gemini...\x1b[0m');
      const [cvRes, coverRes] = await Promise.all([
        this.aiService.draftLatex(savedVacancy.description, candidateProfile, 'cv', 'Español'),
        this.aiService.draftLatex(savedVacancy.description, candidateProfile, 'cover_letter', 'Español'),
      ]);
      cvLatex = cvRes;
      coverLatex = coverRes;

      const tempCvPath = path.resolve('cv', 'temp_cv.tex');
      const tempCoverPath = path.resolve('cover_letters', 'temp_cover.tex');

      await fs.writeFile(tempCvPath, cvLatex, 'utf-8');
      await fs.writeFile(tempCoverPath, coverLatex, 'utf-8');

      // Compilación en Docker
      console.log('\n\x1b[33m[3/4] Compilando documentos LaTeX a PDF mediante Docker (XeTeX/LuaTeX)...\x1b[0m');
      await Promise.all([
        this.latexService.compilePdf(tempCvPath, 'xelatex'),
        this.latexService.compilePdf(tempCoverPath, 'xelatex'),
      ]);

      // Mover archivos al almacenamiento estructurado
      console.log('\n\x1b[33m[4/4] Moviendo PDFs al almacenamiento local y limpiando temporales...\x1b[0m');
      const savedPaths = await this.storageService.saveApplicationFiles(
        savedVacancy.company,
        savedVacancy.role,
        tempCvPath.replace('.tex', '.pdf'),
        tempCoverPath.replace('.tex', '.pdf'),
      );

      // Actualizar estado de postulación
      savedApplication.status = ApplicationStatus.ENVIADO;
      await this.applicationRepository.save(savedApplication);

      console.log('\n\x1b[32m===================================================');
      console.log('¡ÉXITO! Documentos de postulación creados con éxito.');
      console.log('===================================================');
      console.log('Carpeta destino:');
      console.log(`  ${path.dirname(savedPaths.cvDest)}`);
      console.log(`- CV Guardado: ${path.basename(savedPaths.cvDest)}`);
      console.log(`- Carta Guardada: ${path.basename(savedPaths.coverLetterDest)}`);
      console.log(`Estado de la postulación en Base de Datos: ENVIADO`);
      console.log('===================================================\x1b[0m\n');

    } catch (error) {
      this.logger.error(`Error durante el flujo del comando scrape: ${error.message}`);
      
      // Actualizar estado de la postulación a ERROR en caso de fallo en la compilación u otra fase
      if (savedApplication) {
        try {
          savedApplication.status = 'ERROR' as any;
          await this.applicationRepository.save(savedApplication);
          this.logger.log('Estado de la postulación actualizado a: ERROR');
        } catch (dbErr) {
          this.logger.error(`No se pudo actualizar el estado de error en la base de datos: ${dbErr.message}`);
        }
      }
    } finally {
      // Limpiar archivos temporales
      await fs.unlink(path.resolve('cv', 'temp_cv.tex')).catch(() => {});
      await fs.unlink(path.resolve('cover_letters', 'temp_cover.tex')).catch(() => {});
      await fs.unlink(path.resolve('cv', 'temp_cv.pdf')).catch(() => {});
      await fs.unlink(path.resolve('cover_letters', 'temp_cover.pdf')).catch(() => {});
    }
  }

  @Option({
    flags: '-u, --url <url>',
    description: 'URL de la vacante a la que deseas hacer scraping',
  })
  parseUrl(val: string) {
    return val;
  }
}

@QuestionSet({ name: 'scrape-confirm-questions' })
export class ScrapeConfirmQuestions {
  @Question({
    type: 'confirm',
    name: 'evaluate',
    message: '¿Deseas evaluar esta vacante y generar los documentos ahora mismo?',
    default: true,
  })
  parseEvaluate(val: boolean) {
    return val;
  }
}
