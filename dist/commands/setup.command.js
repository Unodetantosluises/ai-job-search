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
var SetupCommand_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupCareerQuestions = exports.SetupBehavioralQuestions = exports.SetupOverwriteConfirmQuestion = exports.SetupConfirmQuestion = exports.SetupCommand = void 0;
const nest_commander_1 = require("nest-commander");
const common_1 = require("@nestjs/common");
const ai_service_1 = require("../ai/ai.service");
const fs = require("fs/promises");
const path = require("path");
const pdf_parse_1 = require("pdf-parse");
let SetupCommand = SetupCommand_1 = class SetupCommand extends nest_commander_1.CommandRunner {
    constructor(aiService, inquirerService) {
        super();
        this.aiService = aiService;
        this.inquirerService = inquirerService;
        this.logger = new common_1.Logger(SetupCommand_1.name);
        this.skillsDir = path.join(process.cwd(), 'docs_prompts', 'skills', 'job-application-assistant');
    }
    async run() {
        console.log('\n\x1b[36m===================================================');
        console.log('         INICIANDO PROCESO DE SETUP (PERFIL)         ');
        console.log('===================================================\x1b[0m');
        await this.runDocumentPhase();
        const { runInteractive } = await this.inquirerService.ask('setup-confirm', {});
        if (!runInteractive) {
            console.log('\n\x1b[33mSetup finalizado. Fase interactiva omitida.\x1b[0m');
            console.log('Puedes volver a ejecutar "npm run cli -- setup" en cualquier momento para completarla.\n');
            return;
        }
        await this.runBehavioralPhase();
        await this.runCareerGoalsPhase();
        console.log('\n\x1b[32m===================================================');
        console.log('       ¡Setup completo! Todos los perfiles generados.      ');
        console.log('===================================================\x1b[0m\n');
    }
    async runDocumentPhase() {
        const folders = [
            path.join('documents', 'cv'),
            path.join('documents', 'diplomas'),
            path.join('documents', 'linkedin'),
            path.join('documents', 'references'),
        ];
        let fullRawText = '';
        for (const folder of folders) {
            const folderPath = path.resolve(process.cwd(), folder);
            try {
                const stat = await fs.stat(folderPath);
                if (!stat.isDirectory())
                    continue;
                this.logger.log(`Escaneando carpeta: ${folder}`);
                const files = await fs.readdir(folderPath);
                for (const file of files) {
                    const filePath = path.join(folderPath, file);
                    const fileStat = await fs.stat(filePath);
                    if (!fileStat.isFile())
                        continue;
                    const ext = path.extname(file).toLowerCase();
                    if (ext === '.pdf') {
                        this.logger.log(`Extrayendo texto de PDF: ${file}`);
                        try {
                            const dataBuffer = await fs.readFile(filePath);
                            const parser = new pdf_parse_1.PDFParse({ data: dataBuffer });
                            const result = await parser.getText();
                            if (result.text) {
                                fullRawText += `\n--- CONTENIDO DOCUMENTO (${file}) ---\n${result.text}\n`;
                            }
                        }
                        catch (pdfErr) {
                            this.logger.error(`Error al procesar el archivo PDF ${file}: ${pdfErr.message}`);
                        }
                    }
                    else if (ext === '.txt' || ext === '.md') {
                        this.logger.log(`Leyendo archivo de texto: ${file}`);
                        try {
                            const textContent = await fs.readFile(filePath, 'utf-8');
                            fullRawText += `\n--- CONTENIDO DOCUMENTO (${file}) ---\n${textContent}\n`;
                        }
                        catch (txtErr) {
                            this.logger.error(`Error al leer el archivo de texto ${file}: ${txtErr.message}`);
                        }
                    }
                }
            }
            catch (err) {
                this.logger.debug(`Carpeta ${folder} no escaneada o inexistente: ${err.message}`);
            }
        }
        if (!fullRawText.trim()) {
            console.log('\n\x1b[33m[AVISO]: No se encontraron documentos válidos (.pdf, .txt, .md) en las carpetas de origen.\x1b[0m');
            console.log('\x1b[33mOmitiendo generación de 01-candidate-profile.md. Continuando con perfil interactivo...\x1b[0m\n');
            return;
        }
        try {
            this.logger.log('Enviando texto extraído a Gemini para estructurar el perfil...');
            const markdownProfile = await this.aiService.buildCandidateProfile(fullRawText);
            const outputPath = path.join(this.skillsDir, '01-candidate-profile.md');
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, markdownProfile, 'utf-8');
            console.log('\n\x1b[32m[FASE 1 COMPLETADA]\x1b[0m 01-candidate-profile.md generado.');
            console.log(`  → ${outputPath}\n`);
        }
        catch (apiErr) {
            this.logger.error(`Error durante la generación del perfil por IA: ${apiErr.message}`);
        }
    }
    async runBehavioralPhase() {
        console.log('\n\x1b[36m─── BLOQUE A-C: Perfil Conductual ───────────────────\x1b[0m');
        console.log('Responde cada pregunta de forma honesta y abierta.');
        console.log('No hay respuestas correctas o incorrectas.\n');
        const answers = await this.inquirerService.ask('setup-behavioral', {});
        const behavioralPath = path.join(this.skillsDir, '02-behavioral-profile.md');
        let shouldWrite = true;
        try {
            const existing = await fs.readFile(behavioralPath, 'utf-8');
            if (!existing.includes('[YOUR_NAME]') && !existing.includes('[PROFILE_TYPE]')) {
                const { overwrite } = await this.inquirerService.ask('setup-overwrite-confirm', {});
                shouldWrite = overwrite;
            }
        }
        catch {
        }
        if (!shouldWrite) {
            console.log('\x1b[33m[OMITIDO] 02-behavioral-profile.md conservado sin cambios.\x1b[0m');
            return;
        }
        const answersMap = {
            'Resolución de problemas (¿piensas solo primero o consultas de inmediato?)': answers.problemSolving,
            'Multitasking (¿cómo manejas varios proyectos a la vez?)': answers.multitasking,
            'Fase favorita de un proyecto (¿planeación/diseño o ejecución?)': answers.projectPhase,
            'Rol en equipo (¿qué papel tomas naturalmente?)': answers.teamRole,
            'Fuente de energía (¿qué te carga más en el día a día?)': answers.energySource,
            'Ambiente de trabajo ideal (¿estructurado, flexible o híbrido?)': answers.workEnvironment,
            'Reacción ante cambios de último momento': answers.changeReaction,
            'Estilo de liderazgo preferido en un jefe': answers.managerStyle,
            'Tareas o dinámicas que drenan tu energía': answers.drainTasks,
            'Estándar de calidad al entregar trabajo': answers.deliveryQuality,
            'Áreas de mejora que reconoces en ti mismo': answers.growthAreas,
            'Comodidad con presentaciones frente a grupos': answers.presentationsComfort,
            'Reacción ante errores repetidos en un proyecto': answers.failureReaction,
            'Cómo crees que te perciben tus compañeros': answers.peerPerception,
        };
        try {
            this.logger.log('Enviando respuestas conductuales a Gemini...');
            const behavioralMarkdown = await this.aiService.generateBehavioralProfile(answersMap);
            await fs.mkdir(path.dirname(behavioralPath), { recursive: true });
            await fs.writeFile(behavioralPath, behavioralMarkdown, 'utf-8');
            console.log('\n\x1b[32m[FASE 2A COMPLETADA]\x1b[0m 02-behavioral-profile.md generado.');
            console.log(`  → ${behavioralPath}\n`);
        }
        catch (err) {
            this.logger.error(`Error al generar el perfil conductual: ${err.message}`);
        }
    }
    async runCareerGoalsPhase() {
        console.log('\n\x1b[36m─── BLOQUE D-E: Metas de Carrera ────────────────────\x1b[0m');
        console.log('Estas respuestas ajustan el framework de evaluación de vacantes.\n');
        const answers = await this.inquirerService.ask('setup-career', {});
        const answersMap = {
            'Meta de carrera a corto plazo (1-2 años)': answers.shortTermGoal,
            'Meta de carrera a largo plazo (3-5 años)': answers.longTermGoal,
            'Habilidad o área que quieres desarrollar': answers.learningGoal,
            'Tipos de trabajo o tareas que te energizan': answers.energizingWork,
            'Tipos de trabajo o tareas que te drenan': answers.drainingWork,
        };
        try {
            this.logger.log('Enviando metas de carrera a Gemini...');
            const goalsJson = await this.aiService.generateCareerGoals(answersMap);
            let goals;
            try {
                goals = JSON.parse(goalsJson);
            }
            catch {
                this.logger.error('Gemini devolvió un JSON inválido para metas de carrera. Omitiendo actualización de 04-job-evaluation.md.');
                return;
            }
            const evalPath = path.join(this.skillsDir, '04-job-evaluation.md');
            let evalContent = await fs.readFile(evalPath, 'utf-8');
            evalContent = evalContent
                .replace('[YOUR_CAREER_GOAL_1]', goals.career_goal_1 ?? '[YOUR_CAREER_GOAL_1]')
                .replace('[YOUR_CAREER_GOAL_2]', goals.career_goal_2 ?? '[YOUR_CAREER_GOAL_2]')
                .replace('[YOUR_CAREER_GOAL_3]', goals.career_goal_3 ?? '[YOUR_CAREER_GOAL_3]')
                .replace('[YOUR_ENERGIZING_TASKS]', goals.energizing_tasks ?? '[YOUR_ENERGIZING_TASKS]')
                .replace('[YOUR_DRAINING_TASKS]', goals.draining_tasks ?? '[YOUR_DRAINING_TASKS]');
            await fs.writeFile(evalPath, evalContent, 'utf-8');
            console.log('\n\x1b[32m[FASE 2B COMPLETADA]\x1b[0m Metas de carrera actualizadas en 04-job-evaluation.md.');
            console.log(`  → ${evalPath}\n`);
        }
        catch (err) {
            this.logger.error(`Error al actualizar metas de carrera: ${err.message}`);
        }
    }
};
exports.SetupCommand = SetupCommand;
exports.SetupCommand = SetupCommand = SetupCommand_1 = __decorate([
    (0, nest_commander_1.Command)({
        name: 'setup',
        description: 'Configurar perfil del candidato: lee documentos y/o hace preguntas interactivas para generar los archivos de perfil',
    }),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        nest_commander_1.InquirerService])
], SetupCommand);
let SetupConfirmQuestion = class SetupConfirmQuestion {
    parseRunInteractive(val) {
        return val;
    }
};
exports.SetupConfirmQuestion = SetupConfirmQuestion;
__decorate([
    (0, nest_commander_1.Question)({
        type: 'confirm',
        name: 'runInteractive',
        message: '¿Deseas configurar también tu perfil conductual y metas de carrera? (Fase interactiva ~10 min)',
        default: true,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", void 0)
], SetupConfirmQuestion.prototype, "parseRunInteractive", null);
exports.SetupConfirmQuestion = SetupConfirmQuestion = __decorate([
    (0, nest_commander_1.QuestionSet)({ name: 'setup-confirm' })
], SetupConfirmQuestion);
let SetupOverwriteConfirmQuestion = class SetupOverwriteConfirmQuestion {
    parseOverwrite(val) {
        return val;
    }
};
exports.SetupOverwriteConfirmQuestion = SetupOverwriteConfirmQuestion;
__decorate([
    (0, nest_commander_1.Question)({
        type: 'confirm',
        name: 'overwrite',
        message: 'Ya existe un perfil conductual llenado. ¿Deseas sobrescribirlo con las nuevas respuestas?',
        default: false,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", void 0)
], SetupOverwriteConfirmQuestion.prototype, "parseOverwrite", null);
exports.SetupOverwriteConfirmQuestion = SetupOverwriteConfirmQuestion = __decorate([
    (0, nest_commander_1.QuestionSet)({ name: 'setup-overwrite-confirm' })
], SetupOverwriteConfirmQuestion);
let SetupBehavioralQuestions = class SetupBehavioralQuestions {
    parseProblemSolving(val) { return val.trim(); }
    parseMultitasking(val) { return val.trim(); }
    parseProjectPhase(val) { return val.trim(); }
    parseTeamRole(val) { return val.trim(); }
    parseEnergySource(val) { return val.trim(); }
    parseWorkEnvironment(val) { return val.trim(); }
    parseChangeReaction(val) { return val.trim(); }
    parseManagerStyle(val) { return val.trim(); }
    parseDrainTasks(val) { return val.trim(); }
    parseDeliveryQuality(val) { return val.trim(); }
    parseGrowthAreas(val) { return val.trim(); }
    parsePresentationsComfort(val) { return val.trim(); }
    parseFailureReaction(val) { return val.trim(); }
    parsePeerPerception(val) { return val.trim(); }
};
exports.SetupBehavioralQuestions = SetupBehavioralQuestions;
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'problemSolving',
        message: '[A1] Cuando enfrentas un problema difícil, ¿prefieres pensar solo antes de consultar, o discutirlo desde el inicio?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseProblemSolving", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'multitasking',
        message: '[A2] ¿Cómo manejas tener varios proyectos o intereses simultáneos?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseMultitasking", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'projectPhase',
        message: '[A3] En un proyecto nuevo, ¿qué te emociona más: la planeación/diseño, o la ejecución/resultados?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseProjectPhase", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'teamRole',
        message: '[A4] En un equipo, ¿qué rol adoptas naturalmente? (liderar, ejecutar, cuestionar, apoyar...)',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseTeamRole", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'energySource',
        message: '[A5] ¿Qué tipo de trabajo te carga más energía en el día a día? (resolver bugs, aprender algo nuevo, colaborar, ver resultados...)',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseEnergySource", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'workEnvironment',
        message: '[B1] ¿Qué ambiente de trabajo te hace rendir mejor? (estructura fija, flexibilidad total, híbrido...)',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseWorkEnvironment", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'changeReaction',
        message: '[B2] ¿Cómo reaccionas cuando te cambian los planes o llega una tarea urgente de último momento?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseChangeReaction", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'managerStyle',
        message: '[B3] ¿Qué estilo de jefe o liderazgo te funciona mejor?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseManagerStyle", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'drainTasks',
        message: '[B4] ¿Hay tareas o dinámicas de trabajo que te drenan especialmente?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseDrainTasks", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'deliveryQuality',
        message: '[B5] Cuando entregas algo, ¿lo mandas cuando está "suficientemente bueno" o necesitas sentirlo pulido?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseDeliveryQuality", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'growthAreas',
        message: '[C1] ¿Qué aspectos de tu forma de trabajar reconoces que puedes mejorar? (delegar, puntualidad, estimaciones de tiempo...)',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseGrowthAreas", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'presentationsComfort',
        message: '[C2] ¿Cómo te sientes con las presentaciones o exponer ideas frente a un grupo?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parsePresentationsComfort", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'failureReaction',
        message: '[C3] Cuando algo sale mal repetidamente en un proyecto, ¿cuál es tu reacción natural?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parseFailureReaction", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'peerPerception',
        message: '[C4] En 2-3 palabras, ¿cómo crees que te describen tus compañeros de trabajo?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupBehavioralQuestions.prototype, "parsePeerPerception", null);
exports.SetupBehavioralQuestions = SetupBehavioralQuestions = __decorate([
    (0, nest_commander_1.QuestionSet)({ name: 'setup-behavioral' })
], SetupBehavioralQuestions);
let SetupCareerQuestions = class SetupCareerQuestions {
    parseShortTermGoal(val) { return val.trim(); }
    parseLongTermGoal(val) { return val.trim(); }
    parseLearningGoal(val) { return val.trim(); }
    parseEnergizingWork(val) { return val.trim(); }
    parseDrainingWork(val) { return val.trim(); }
};
exports.SetupCareerQuestions = SetupCareerQuestions;
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'shortTermGoal',
        message: '[D1] ¿Cuál es tu meta de carrera principal en los próximos 1-2 años?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupCareerQuestions.prototype, "parseShortTermGoal", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'longTermGoal',
        message: '[D2] ¿Y a 3-5 años, hacia dónde quieres llevar tu carrera?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupCareerQuestions.prototype, "parseLongTermGoal", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'learningGoal',
        message: '[D3] ¿Hay alguna habilidad técnica o área específica que quieres desarrollar en tu próximo trabajo?',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupCareerQuestions.prototype, "parseLearningGoal", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'energizingWork',
        message: '[E1] ¿Qué tipo de tareas o responsabilidades te gustaría que tuviera tu próximo rol? (las que te energizan)',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupCareerQuestions.prototype, "parseEnergizingWork", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'drainingWork',
        message: '[E2] ¿Qué tipo de tareas esperas minimizar o evitar en tu próximo trabajo? (las que te drenan)',
        validate: (v) => (v?.trim() ? true : 'Por favor responde la pregunta.'),
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SetupCareerQuestions.prototype, "parseDrainingWork", null);
exports.SetupCareerQuestions = SetupCareerQuestions = __decorate([
    (0, nest_commander_1.QuestionSet)({ name: 'setup-career' })
], SetupCareerQuestions);
//# sourceMappingURL=setup.command.js.map