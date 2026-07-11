import { Command, CommandRunner } from 'nest-commander';
import { LatexService } from './latex/latex.service';
import { StorageService } from './storage/storage.service';
import { AiService } from './ai/ai.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vacancy } from './database/entities/vacancy.entity';
import { Application, ApplicationStatus } from './database/entities/application.entity';
import { Evaluation } from './database/entities/evaluation.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Command({
  name: 'test',
  description: 'Prueba de la CLI, base de datos, almacenamiento y Gemini API',
})
export class TestCommand extends CommandRunner {
  constructor(
    private readonly latexService: LatexService,
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
    @InjectRepository(Vacancy)
    private readonly vacancyRepository: Repository<Vacancy>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
  ) {
    super();
  }

  async run(inputs: string[], options: Record<string, any>): Promise<void> {
    console.log('===================================================');
    console.log('¡Hola! La CLI de NestJS y nest-commander responde.');
    console.log('===================================================');
    console.log('Argumentos recibidos:', inputs);
    
    // 1. Validar variable de entorno
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const maskedKey = apiKey.length > 10 
        ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`
        : '***';
      console.log(`Estado API Key: GEMINI_API_KEY detectada (${maskedKey})`);
    } else {
      console.warn('Estado API Key: GEMINI_API_KEY NO está definida en el entorno.');
    }

    // 2. Ejecutar prueba de Base de Datos SQLite si se solicita
    if (inputs.includes('db')) {
      console.log('\n--- Ejecutando Prueba de Persistencia (SQLite + TypeORM) ---');
      try {
        console.log('1. Creando una vacante de prueba...');
        const vacancy = new Vacancy();
        vacancy.company = 'Google Spain';
        vacancy.role = 'Desarrollador NestJS';
        vacancy.description = 'Desarrollo de herramientas CLI avanzadas y microservicios.';
        vacancy.location_type = 'Remoto';
        vacancy.url = 'https://careers.google.com';
        const savedVacancy = await this.vacancyRepository.save(vacancy);
        console.log(`Vacante guardada con ID: ${savedVacancy.id}`);

        console.log('2. Creando postulación vinculada...');
        const application = new Application();
        application.vacancy = savedVacancy;
        application.status = ApplicationStatus.ENVIADO;
        const savedApplication = await this.applicationRepository.save(application);
        console.log(`Postulación guardada con ID: ${savedApplication.id} y estado ${savedApplication.status}`);

        console.log('3. Creando perfil de evaluación IA...');
        const evaluation = new Evaluation();
        evaluation.application = savedApplication;
        evaluation.score = 92;
        evaluation.fit_analysis = 'El perfil tiene excelente compatibilidad con TypeScript y NestJS.';
        const savedEvaluation = await this.evaluationRepository.save(evaluation);
        console.log(`Evaluación guardada con ID: ${savedEvaluation.id} (Score: ${savedEvaluation.score}%)`);

        // Consultar con relaciones
        console.log('\n4. Buscando vacantes registradas con sus relaciones...');
        const allVacancies = await this.vacancyRepository.find({
          relations: {
            applications: {
              evaluation: true,
            },
          },
        });
        console.log('Registros encontrados:', JSON.stringify(allVacancies, null, 2));

        // Validar borrado en cascada
        console.log(`\n5. Probando borrado en cascada (Eliminando Vacante ID: ${savedVacancy.id})...`);
        await this.vacancyRepository.remove(savedVacancy);
        console.log('Vacante eliminada.');

        const appsLeft = await this.applicationRepository.find();
        const evalsLeft = await this.evaluationRepository.find();
        console.log(`Postulaciones restantes en la DB: ${appsLeft.length}`);
        console.log(`Evaluaciones restantes en la DB: ${evalsLeft.length}`);
        
        if (appsLeft.length === 0 && evalsLeft.length === 0) {
          console.log('¡Éxito! El borrado en cascada funcionó correctamente (cero huérfanos).');
        } else {
          console.warn('Advertencia: El borrado en cascada no eliminó todos los registros asociados.');
        }

      } catch (err) {
        console.error('Error durante la prueba de DB:', err.message);
      }
    }

    // 3. Ejecutar prueba de Almacenamiento Estructurado
    if (inputs.includes('storage')) {
      console.log('\n--- Ejecutando Prueba de Almacenamiento Estructurado (StorageService) ---');
      const testPdf = path.resolve('cover_letters', 'cover_example.pdf');
      
      try {
        // Verificar si existe el archivo PDF de prueba
        await fs.access(testPdf);
        
        console.log(`Utilizando archivo PDF de origen: ${testPdf}`);
        const { cvDest, coverLetterDest } = await this.storageService.saveApplicationFiles(
          'Acme Corp & Partners!',
          'Desarrollador Senior (NestJS & Docker)',
          testPdf,
          testPdf
        );

        // Validar que se crearon los archivos copiados
        const cvStats = await fs.stat(cvDest);
        const coverStats = await fs.stat(coverLetterDest);
        console.log(`\n¡Éxito! Estructura creada en local_storage/`);
        console.log(`- CV copiado a: ${cvDest} (${cvStats.size} bytes)`);
        console.log(`- Carta de Presentación copiada a: ${coverLetterDest} (${coverStats.size} bytes)`);

      } catch (err) {
        console.error('Error en prueba de storage (¿compilaste primero cover_letters/cover_example.tex?):', err.message);
      }
    }

    // 4. Ejecutar prueba de llamadas a la API de Gemini (AI)
    if (inputs.includes('ai')) {
      console.log('\n--- Ejecutando Prueba de Inteligencia Artificial (Google Gemini API) ---');
      const vacanteDesc = `
Buscamos un Desarrollador Backend Senior experto en Node.js, NestJS y Docker.
Debe tener experiencia diseñando APIs RESTful robustas y configurando bases de datos relacionales.
Deseable conocimiento en compilers y TeX Live.
`;
      const candidatoPerfil = `
Luis Díaz es un ingeniero de software con 6 años de experiencia en backend usando Node.js, NestJS, Express, y TypeScript.
Ha desarrollado sistemas de alta disponibilidad e integrado diversas APIs. Posee conocimientos de Docker, Docker Compose, 
bases de datos PostgreSQL y MySQL, y tiene nociones básicas de compilación LaTeX.
`;

      try {
        console.log('1. Probando evaluateFit (Ajuste cuantitativo/cualitativo en formato JSON)...');
        const evalResult = await this.aiService.evaluateFit(vacanteDesc, candidatoPerfil);
        console.log('Objeto JSON parseado con éxito:');
        console.log(`- Score: ${evalResult.score}`);
        console.log(`- Analysis:\n${evalResult.analysis}`);

        console.log('\n2. Probando draftLatex (Generar borrador de Carta de Presentación)...');
        const latexResult = await this.aiService.draftLatex(vacanteDesc, candidatoPerfil, 'cover_letter');
        console.log('Código LaTeX generado (primeras 400 letras):');
        console.log('----------------------------------------------------');
        console.log(latexResult.substring(0, 400) + '...\n');
        console.log('----------------------------------------------------');
        console.log('¿Empieza con bloque markdown ```?:', latexResult.trim().startsWith('```') ? 'SÍ (Fallo de sanitización)' : 'NO (Correcto - LaTeX plano)');
      } catch (err) {
        console.error('Error durante la prueba de IA con Gemini:', err.message);
      }
    }

    // 5. Compilación de prueba LaTeX
    if (inputs.includes('compile')) {
      const compileIdx = inputs.indexOf('compile');
      const targetFile = inputs[compileIdx + 1] || 'cv/main_example.tex';

      console.log(`\nEjecutando compilación de LaTeX para ${targetFile}...`);
      try {
        await this.latexService.compilePdf(targetFile, 'xelatex');
        console.log('Proceso de compilación ejecutado.');
        
        const ext = path.extname(targetFile);
        const pdfPath = path.resolve(targetFile.substring(0, targetFile.length - ext.length) + '.pdf');
        try {
          const stats = await fs.stat(pdfPath);
          console.log(`\n¡Éxito! Archivo PDF verificado localmente en:\n  ${pdfPath} (${stats.size} bytes)`);
        } catch {
          console.error(`\nError: Se completó la compilación pero no se encontró el PDF en la ruta esperada: ${pdfPath}`);
        }
      } catch (err) {
        console.error(`\n[ERROR COMPILACIÓN]: ${err.message}`);
      }
    }

    if (!inputs.includes('db') && !inputs.includes('storage') && !inputs.includes('ai') && !inputs.includes('compile')) {
      console.log('\nSugerencias de prueba:');
      console.log('- Para probar la DB SQLite: npm run cli -- test db');
      console.log('- Para probar el StorageService: npm run cli -- test storage');
      console.log('- Para probar la IA con Gemini: npm run cli -- test ai');
      console.log('- Para probar compilación LaTeX: npm run cli -- test compile [ruta_archivo.tex]');
    }
    
    console.log('===================================================');
  }
}
