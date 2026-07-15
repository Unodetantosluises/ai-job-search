"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ScrapeCommand_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrapeConfirmQuestions = exports.ScrapeCommand = void 0;
const nest_commander_1 = require("nest-commander");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const nest_commander_2 = require("nest-commander");
const fs = require("fs/promises");
const path = require("path");
const scraper_service_1 = require("../scraper/scraper.service");
const ai_service_1 = require("../ai/ai.service");
const latex_service_1 = require("../latex/latex.service");
const storage_service_1 = require("../storage/storage.service");
const vacancy_entity_1 = require("../database/entities/vacancy.entity");
const application_entity_1 = require("../database/entities/application.entity");
const evaluation_entity_1 = require("../database/entities/evaluation.entity");
let ScrapeCommand = ScrapeCommand_1 = class ScrapeCommand extends nest_commander_1.CommandRunner {
    constructor(scraperService, inquirerService, aiService, latexService, storageService, vacancyRepository, applicationRepository, evaluationRepository) {
        super();
        this.scraperService = scraperService;
        this.inquirerService = inquirerService;
        this.aiService = aiService;
        this.latexService = latexService;
        this.storageService = storageService;
        this.vacancyRepository = vacancyRepository;
        this.applicationRepository = applicationRepository;
        this.evaluationRepository = evaluationRepository;
        this.logger = new common_1.Logger(ScrapeCommand_1.name);
    }
    async run(inputs, options) {
        console.log('\n\x1b[36m===================================================');
        console.log('       INICIANDO PROCESO DE SCRAPING DE VACANTE       ');
        console.log('===================================================\x1b[0m');
        const url = options.url;
        if (!url) {
            console.error('\x1b[31m[ERROR]: Debes proporcionar la URL de la vacante con el flag -u o --url.\x1b[0m');
            return;
        }
        let savedVacancy;
        let savedApplication;
        let cvLatex = '';
        let coverLatex = '';
        try {
            this.logger.log(`Iniciando extracción de datos para la URL: ${url}`);
            const scrapedData = await this.scraperService.extractVacancyData(url);
            this.logger.log('Guardando vacante extraída en la base de datos...');
            const vacancy = new vacancy_entity_1.Vacancy();
            vacancy.company = scrapedData.company || 'Empresa Desconocida';
            vacancy.role = scrapedData.role || 'Puesto Desconocido';
            vacancy.description = scrapedData.description || '';
            vacancy.location_type = scrapedData.location_type || 'No especificado';
            vacancy.url = url;
            vacancy.country = 'No especificado';
            savedVacancy = await this.vacancyRepository.save(vacancy);
            this.logger.log('Creando registro de postulación vinculada en estado EN_ESPERA...');
            const application = new application_entity_1.Application();
            application.vacancy = savedVacancy;
            application.status = application_entity_1.ApplicationStatus.EN_ESPERA;
            savedApplication = await this.applicationRepository.save(application);
            console.log('\n\x1b[32m===================================================');
            console.log('¡ÉXITO! Vacante extraída y guardada correctamente.');
            console.log(`Empresa:   ${savedVacancy.company}`);
            console.log(`Puesto:    ${savedVacancy.role}`);
            console.log(`Modalidad: ${savedVacancy.location_type}`);
            console.log(`Estado:    EN_ESPERA`);
            console.log('===================================================\x1b[0m\n');
            const answers = await this.inquirerService.ask('scrape-confirm-questions', {});
            if (!answers.evaluate) {
                this.logger.log('Flujo terminado. La vacante queda guardada en estado EN_ESPERA para postulación posterior.');
                return;
            }
            console.log('\n\x1b[33m[1/4] Analizando perfil del candidato contra la vacante...\x1b[0m');
            const profilePath = path.join(process.cwd(), 'docs_prompts', 'skills', 'job-application-assistant', '01-candidate-profile.md');
            let candidateProfile = '';
            try {
                candidateProfile = await fs.readFile(profilePath, 'utf-8');
            }
            catch (err) {
                this.logger.warn(`No se pudo leer el perfil de 01-candidate-profile.md. Se usará un perfil vacío. Detalle: ${err.message}`);
            }
            const fitResult = await this.aiService.evaluateFit(savedVacancy.description, candidateProfile, 'Español');
            const evaluation = new evaluation_entity_1.Evaluation();
            evaluation.application = savedApplication;
            evaluation.score = fitResult.score;
            evaluation.fit_analysis = fitResult.analysis;
            await this.evaluationRepository.save(evaluation);
            console.log('\n\x1b[32m--- RESULTADO DE EVALUACIÓN ---');
            console.log(`PUNTACIÓN DE AJUSTE (FIT): ${fitResult.score}/100`);
            console.log('ANÁLISIS CUALITATIVO:');
            console.log(fitResult.analysis);
            console.log('-------------------------------\x1b[0m');
            if (fitResult.score < 75) {
                console.log('\n\x1b[33m[ADVERTENCIA]: El nivel de fit con la vacante es menor a 75/100.\x1b[0m');
                const confirm = await this.inquirerService.ask('confirm-questions', {});
                if (!confirm.continue) {
                    savedApplication.status = application_entity_1.ApplicationStatus.RECHAZADO;
                    await this.applicationRepository.save(savedApplication);
                    console.log('\n\x1b[31m[CANCELADO]: Postulación marcada como RECHAZADA. Proceso terminado.\x1b[0m');
                    console.log('\x1b[36m===================================================\x1b[0m');
                    return;
                }
            }
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
            console.log('\n\x1b[33m[3/4] Compilando documentos LaTeX a PDF mediante Docker (XeTeX/LuaTeX)...\x1b[0m');
            await Promise.all([
                this.latexService.compilePdf(tempCvPath, 'xelatex'),
                this.latexService.compilePdf(tempCoverPath, 'xelatex'),
            ]);
            console.log('\n\x1b[33m[4/4] Moviendo PDFs al almacenamiento local y limpiando temporales...\x1b[0m');
            const savedPaths = await this.storageService.saveApplicationFiles(savedVacancy.company, savedVacancy.role, tempCvPath.replace('.tex', '.pdf'), tempCoverPath.replace('.tex', '.pdf'), tempCvPath, tempCoverPath);
            savedApplication.status = application_entity_1.ApplicationStatus.ENVIADO;
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
        }
        catch (error) {
            this.logger.error(`Error durante el flujo del comando scrape: ${error.message}`);
            if (savedApplication) {
                try {
                    savedApplication.status = 'ERROR';
                    await this.applicationRepository.save(savedApplication);
                    this.logger.log('Estado de la postulación actualizado a: ERROR');
                }
                catch (dbErr) {
                    this.logger.error(`No se pudo actualizar el estado de error en la base de datos: ${dbErr.message}`);
                }
            }
        }
        finally {
            await fs.unlink(path.resolve('cv', 'temp_cv.tex')).catch(() => { });
            await fs.unlink(path.resolve('cover_letters', 'temp_cover.tex')).catch(() => { });
            await fs.unlink(path.resolve('cv', 'temp_cv.pdf')).catch(() => { });
            await fs.unlink(path.resolve('cover_letters', 'temp_cover.pdf')).catch(() => { });
        }
    }
    parseUrl(val) {
        return val;
    }
};
exports.ScrapeCommand = ScrapeCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-u, --url <url>',
        description: 'URL de la vacante a la que deseas hacer scraping',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ScrapeCommand.prototype, "parseUrl", null);
exports.ScrapeCommand = ScrapeCommand = ScrapeCommand_1 = __decorate([
    (0, nest_commander_1.Command)({
        name: 'scrape',
        description: 'Extraer datos de una vacante directamente a la base de datos por URL y dar opción a postularse',
    }),
    __param(5, (0, typeorm_1.InjectRepository)(vacancy_entity_1.Vacancy)),
    __param(6, (0, typeorm_1.InjectRepository)(application_entity_1.Application)),
    __param(7, (0, typeorm_1.InjectRepository)(evaluation_entity_1.Evaluation)),
    __metadata("design:paramtypes", [scraper_service_1.ScraperService,
        nest_commander_2.InquirerService,
        ai_service_1.AiService,
        latex_service_1.LatexService,
        storage_service_1.StorageService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ScrapeCommand);
let ScrapeConfirmQuestions = class ScrapeConfirmQuestions {
    parseEvaluate(val) {
        return val;
    }
};
exports.ScrapeConfirmQuestions = ScrapeConfirmQuestions;
__decorate([
    (0, nest_commander_1.Question)({
        type: 'confirm',
        name: 'evaluate',
        message: '¿Deseas evaluar esta vacante y generar los documentos ahora mismo?',
        default: true,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", void 0)
], ScrapeConfirmQuestions.prototype, "parseEvaluate", null);
exports.ScrapeConfirmQuestions = ScrapeConfirmQuestions = __decorate([
    (0, nest_commander_1.QuestionSet)({ name: 'scrape-confirm-questions' })
], ScrapeConfirmQuestions);
//# sourceMappingURL=scrape.command.js.map