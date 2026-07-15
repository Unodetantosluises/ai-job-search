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
var ApplyCommand_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmQuestions = exports.ApplyQuestions = exports.ApplyCommand = void 0;
const nest_commander_1 = require("nest-commander");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const vacancy_entity_1 = require("../database/entities/vacancy.entity");
const application_entity_1 = require("../database/entities/application.entity");
const evaluation_entity_1 = require("../database/entities/evaluation.entity");
const ai_service_1 = require("../ai/ai.service");
const latex_service_1 = require("../latex/latex.service");
const storage_service_1 = require("../storage/storage.service");
const fs = require("fs/promises");
const path = require("path");
const common_1 = require("@nestjs/common");
let ApplyCommand = ApplyCommand_1 = class ApplyCommand extends nest_commander_1.CommandRunner {
    constructor(inquirerService, aiService, latexService, storageService, vacancyRepository, applicationRepository, evaluationRepository) {
        super();
        this.inquirerService = inquirerService;
        this.aiService = aiService;
        this.latexService = latexService;
        this.storageService = storageService;
        this.vacancyRepository = vacancyRepository;
        this.applicationRepository = applicationRepository;
        this.evaluationRepository = evaluationRepository;
        this.logger = new common_1.Logger(ApplyCommand_1.name);
    }
    async run(inputs, options) {
        console.log('\n\x1b[36m===================================================');
        console.log('       INICIANDO PROCESO DE POSTULACIÓN (APPLY)       ');
        console.log('===================================================\x1b[0m');
        let company = options.company;
        let role = options.role;
        let description = options.description;
        const language = options.language || 'Español';
        const country = options.country || 'No especificado';
        if (!company || !role || !description) {
            this.logger.log('Solicitando datos requeridos mediante interfaz interactiva...');
            const answers = await this.inquirerService.ask('apply-questions', options);
            company = answers.company || company;
            role = answers.role || role;
            description = answers.description || description;
        }
        if (!company || !role || !description) {
            console.error('\x1b[31m[ERROR]: Faltan argumentos mandatorios (empresa, rol o descripción).\x1b[0m');
            return;
        }
        let descriptionText = description;
        try {
            await fs.access(description);
            this.logger.log(`Leyendo descripción de vacante desde archivo: ${description}`);
            descriptionText = await fs.readFile(description, 'utf-8');
        }
        catch {
        }
        let savedVacancy;
        let savedApplication;
        let cvLatex = '';
        let coverLatex = '';
        try {
            this.logger.log('Guardando vacante y postulacion inicial en la base de datos...');
            const vacancy = new vacancy_entity_1.Vacancy();
            vacancy.company = company;
            vacancy.role = role;
            vacancy.description = descriptionText;
            vacancy.location_type = 'No especificado';
            vacancy.url = 'No especificada';
            vacancy.country = country;
            savedVacancy = await this.vacancyRepository.save(vacancy);
            const application = new application_entity_1.Application();
            application.vacancy = savedVacancy;
            application.status = application_entity_1.ApplicationStatus.EN_ESPERA;
            savedApplication = await this.applicationRepository.save(application);
            console.log('\n\x1b[33m[1/4] Analizando perfil del candidato contra la vacante...\x1b[0m');
            const profilePath = path.join(process.cwd(), 'docs_prompts', 'skills', 'job-application-assistant', '01-candidate-profile.md');
            let candidateProfile = '';
            try {
                candidateProfile = await fs.readFile(profilePath, 'utf-8');
            }
            catch (err) {
                this.logger.warn(`No se pudo leer el perfil de 01-candidate-profile.md. Se usará un perfil vacío. Detalle: ${err.message}`);
            }
            const fitResult = await this.aiService.evaluateFit(descriptionText, candidateProfile, language);
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
            console.log('\n\x1b[33m[4/4] Moviendo PDFs al almacenamiento local y limpiando temporales...\x1b[0m');
            const tempCvPdf = path.resolve('cv', 'temp_cv.pdf');
            const tempCoverPdf = path.resolve('cover_letters', 'temp_cover.pdf');
            const { cvDest, coverLetterDest } = await this.storageService.saveApplicationFiles(company, role, tempCvPdf, tempCoverPdf, tempCvPath, tempCoverPath);
            await fs.unlink(tempCvPath).catch(() => { });
            await fs.unlink(tempCoverPath).catch(() => { });
            await fs.unlink(tempCvPdf).catch(() => { });
            await fs.unlink(tempCoverPdf).catch(() => { });
            savedApplication.status = application_entity_1.ApplicationStatus.ENVIADO;
            await this.applicationRepository.save(savedApplication);
            console.log('\n\x1b[32m===================================================');
            console.log('¡ÉXITO! Documentos de postulación creados con éxito.');
            console.log('===================================================');
            console.log(`Carpeta destino:\n  ${path.dirname(cvDest)}`);
            console.log(`- CV Guardado: ${path.basename(cvDest)}`);
            console.log(`- Carta Guardada: ${path.basename(coverLetterDest)}`);
            console.log('Estado de la postulación en Base de Datos: ENVIADO');
            console.log('===================================================\x1b[0m\n');
        }
        catch (error) {
            console.error('\n\x1b[31m[ERROR DURANTE LA OPERACIÓN]:', error.message, '\x1b[0m');
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
                    savedApplication.status = 'ERROR';
                    await this.applicationRepository.save(savedApplication);
                    this.logger.log('Estado de postulación actualizado a: ERROR');
                }
                catch (dbErr) {
                    this.logger.error(`No se pudo actualizar el estado de error en la base de datos: ${dbErr.message}`);
                }
            }
            await fs.unlink(path.resolve('cv', 'temp_cv.tex')).catch(() => { });
            await fs.unlink(path.resolve('cover_letters', 'temp_cover.tex')).catch(() => { });
            await fs.unlink(path.resolve('cv', 'temp_cv.pdf')).catch(() => { });
            await fs.unlink(path.resolve('cover_letters', 'temp_cover.pdf')).catch(() => { });
        }
    }
    parseCompany(val) {
        return val;
    }
    parseRole(val) {
        return val;
    }
    parseDescription(val) {
        return val;
    }
    parseLanguage(val) {
        return val;
    }
    parseCountry(val) {
        return val;
    }
};
exports.ApplyCommand = ApplyCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-c, --company <company>',
        description: 'Nombre de la empresa a la que aplicas',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyCommand.prototype, "parseCompany", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-r, --role <role>',
        description: 'Nombre del puesto o rol vacante',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyCommand.prototype, "parseRole", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-d, --description <description>',
        description: 'Descripción de la vacante (copia el texto o escribe la ruta de un archivo local)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyCommand.prototype, "parseDescription", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-l, --language [language]',
        description: 'Idioma para la postulación y evaluación',
        defaultValue: 'Español',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyCommand.prototype, "parseLanguage", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-ct, --country [country]',
        description: 'País de la vacante',
        defaultValue: 'No especificado',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyCommand.prototype, "parseCountry", null);
exports.ApplyCommand = ApplyCommand = ApplyCommand_1 = __decorate([
    (0, nest_commander_1.Command)({
        name: 'apply',
        description: 'Proceso completo para evaluar y aplicar a una vacante generando CV y carta de presentación',
    }),
    __param(4, (0, typeorm_1.InjectRepository)(vacancy_entity_1.Vacancy)),
    __param(5, (0, typeorm_1.InjectRepository)(application_entity_1.Application)),
    __param(6, (0, typeorm_1.InjectRepository)(evaluation_entity_1.Evaluation)),
    __metadata("design:paramtypes", [nest_commander_1.InquirerService,
        ai_service_1.AiService,
        latex_service_1.LatexService,
        storage_service_1.StorageService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ApplyCommand);
let ApplyQuestions = class ApplyQuestions {
    parseCompany(val) {
        return val;
    }
    parseRole(val) {
        return val;
    }
    parseDescription(val) {
        return val;
    }
};
exports.ApplyQuestions = ApplyQuestions;
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'company',
        message: 'Nombre de la empresa:',
        validate: (val) => (val ? true : 'El nombre de la empresa es obligatorio.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyQuestions.prototype, "parseCompany", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'role',
        message: 'Rol o puesto de la vacante:',
        validate: (val) => (val ? true : 'El rol de la vacante es obligatorio.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyQuestions.prototype, "parseRole", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'description',
        message: 'Descripción de la vacante (texto o ruta de un archivo de texto):',
        validate: (val) => (val ? true : 'La descripción de la vacante es obligatoria.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyQuestions.prototype, "parseDescription", null);
exports.ApplyQuestions = ApplyQuestions = __decorate([
    (0, nest_commander_1.QuestionSet)({ name: 'apply-questions' })
], ApplyQuestions);
let ConfirmQuestions = class ConfirmQuestions {
    parseContinue(val) {
        return val;
    }
};
exports.ConfirmQuestions = ConfirmQuestions;
__decorate([
    (0, nest_commander_1.Question)({
        type: 'confirm',
        name: 'continue',
        message: 'El nivel de fit es bajo. ¿Deseas continuar gastando tokens para generar los PDFs?',
        default: false,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", void 0)
], ConfirmQuestions.prototype, "parseContinue", null);
exports.ConfirmQuestions = ConfirmQuestions = __decorate([
    (0, nest_commander_1.QuestionSet)({ name: 'confirm-questions' })
], ConfirmQuestions);
//# sourceMappingURL=apply.command.js.map