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
var InterviewCommand_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewChatQuestion = exports.InterviewMockConfirm = exports.InterviewStageQuestions = exports.InterviewCommand = void 0;
const nest_commander_1 = require("nest-commander");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const nest_commander_2 = require("nest-commander");
const fs = require("fs/promises");
const path = require("path");
const ai_service_1 = require("../ai/ai.service");
const application_entity_1 = require("../database/entities/application.entity");
let InterviewCommand = InterviewCommand_1 = class InterviewCommand extends nest_commander_1.CommandRunner {
    constructor(aiService, inquirerService, applicationRepository) {
        super();
        this.aiService = aiService;
        this.inquirerService = inquirerService;
        this.applicationRepository = applicationRepository;
        this.logger = new common_1.Logger(InterviewCommand_1.name);
    }
    sanitizeName(name) {
        return name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s\-_]/g, '')
            .trim()
            .replace(/[\s\-]+/g, '_')
            .replace(/_+/g, '_');
    }
    async run(inputs, options) {
        console.log('\n\x1b[36m===================================================');
        console.log('       PREPARACIÓN Y SIMULACRO DE ENTREVISTA       ');
        console.log('===================================================\x1b[0m');
        const id = options.id;
        if (id === undefined || id === null) {
            console.error('\x1b[31m[ERROR]: Debes ingresar el ID de la postulación usando el flag -i o --id.\x1b[0m');
            return;
        }
        try {
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
            }
            catch {
                this.logger.warn(`No se encontró cv_draft.tex en ${cvPath}. Se procederá sin el código fuente del CV.`);
            }
            try {
                coverLetterContent = await fs.readFile(coverPath, 'utf-8');
            }
            catch {
                this.logger.warn(`No se encontró cover_letter.tex en ${coverPath}. Se procederá sin el código fuente de la carta.`);
            }
            const stageAnswers = await this.inquirerService.ask('interview-stage-questions', {});
            const stageDetails = `Etapa: ${stageAnswers.stage}${stageAnswers.interviewer ? ` | Entrevistador: ${stageAnswers.interviewer}` : ''}`;
            console.log('\n\x1b[33mGenerando paquete de preparación (Prep Pack) con Gemini...\x1b[0m');
            const prepPack = await this.aiService.generatePrepPack(app.vacancy, cvContent, coverLetterContent, stageDetails);
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
            const mockAnswers = await this.inquirerService.ask('interview-mock-confirm', {});
            if (!mockAnswers.startMock) {
                console.log('\n\x1b[36m===================================================');
                console.log('¡Buena suerte! Recuerda usar el comando de status para actualizar el resultado de tu entrevista.');
                console.log('===================================================\x1b[0m\n');
                return;
            }
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
            const initResult = await chat.sendMessage('Hola, estoy listo para iniciar la entrevista simulada.');
            console.log(`\n\x1b[35m[Entrevistador]:\x1b[0m ${initResult.response.text()}\n`);
            while (true) {
                const chatAnswer = await this.inquirerService.ask('interview-chat-question', {});
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
        }
        catch (err) {
            this.logger.error(`Error durante la preparación de la entrevista: ${err.message}`);
        }
    }
    parseId(val) {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
            throw new Error('El ID de la postulación debe ser un número entero válido.');
        }
        return parsed;
    }
};
exports.InterviewCommand = InterviewCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-i, --id <id>',
        description: 'ID de la postulación en la base de datos',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Number)
], InterviewCommand.prototype, "parseId", null);
exports.InterviewCommand = InterviewCommand = InterviewCommand_1 = __decorate([
    (0, nest_commander_1.Command)({
        name: 'interview',
        description: 'Generar paquete de preparación de entrevista y ejecutar un simulacro de entrevista interactivo',
    }),
    __param(2, (0, typeorm_1.InjectRepository)(application_entity_1.Application)),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        nest_commander_2.InquirerService,
        typeorm_2.Repository])
], InterviewCommand);
let InterviewStageQuestions = class InterviewStageQuestions {
    parseStage(val) {
        return val;
    }
    parseInterviewer(val) {
        return val;
    }
};
exports.InterviewStageQuestions = InterviewStageQuestions;
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'stage',
        message: '¿Qué etapa de entrevista es? (Ej. Filtro telefónico, Técnica, Final):',
        validate: (val) => (val && val.trim().length > 0) || 'Debes especificar la etapa de la entrevista.',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InterviewStageQuestions.prototype, "parseStage", null);
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'interviewer',
        message: '¿Quién es el entrevistador? (Opcional, presiona Enter para omitir):',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InterviewStageQuestions.prototype, "parseInterviewer", null);
exports.InterviewStageQuestions = InterviewStageQuestions = __decorate([
    (0, nest_commander_1.QuestionSet)({ name: 'interview-stage-questions' })
], InterviewStageQuestions);
let InterviewMockConfirm = class InterviewMockConfirm {
    parseStartMock(val) {
        return val;
    }
};
exports.InterviewMockConfirm = InterviewMockConfirm;
__decorate([
    (0, nest_commander_1.Question)({
        type: 'confirm',
        name: 'startMock',
        message: '¿Deseas iniciar un simulacro de entrevista ahora mismo?',
        default: true,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", void 0)
], InterviewMockConfirm.prototype, "parseStartMock", null);
exports.InterviewMockConfirm = InterviewMockConfirm = __decorate([
    (0, nest_commander_1.QuestionSet)({ name: 'interview-mock-confirm' })
], InterviewMockConfirm);
let InterviewChatQuestion = class InterviewChatQuestion {
    parseUserResponse(val) {
        return val;
    }
};
exports.InterviewChatQuestion = InterviewChatQuestion;
__decorate([
    (0, nest_commander_1.Question)({
        type: 'input',
        name: 'userResponse',
        message: 'Tú:',
        validate: (val) => (val && val.trim().length > 0) || 'Debes ingresar un mensaje (o escribe "salir" para terminar).',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InterviewChatQuestion.prototype, "parseUserResponse", null);
exports.InterviewChatQuestion = InterviewChatQuestion = __decorate([
    (0, nest_commander_1.QuestionSet)({ name: 'interview-chat-question' })
], InterviewChatQuestion);
//# sourceMappingURL=interview.command.js.map