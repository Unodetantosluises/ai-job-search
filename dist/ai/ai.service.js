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
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
const fs = require("fs/promises");
const path = require("path");
let AiService = AiService_1 = class AiService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(AiService_1.name);
    }
    onModuleInit() {
        const apiKey = this.configService.get('GEMINI_API_KEY');
        if (!apiKey) {
            this.logger.error('GEMINI_API_KEY no está definida en las variables de entorno o archivo .env.');
            return;
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    async loadSystemPrompt(fileName) {
        try {
            const filePath = path.join(process.cwd(), 'docs_prompts', 'commands', fileName);
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        }
        catch (error) {
            this.logger.warn(`No se pudo cargar el prompt del archivo docs_prompts/commands/${fileName}: ${error.message}`);
            return '';
        }
    }
    async loadTemplate(templateType) {
        try {
            const fileName = templateType === 'cv'
                ? path.join('cv', 'main_example.tex')
                : path.join('cover_letters', 'cover_example.tex');
            const filePath = path.join(process.cwd(), fileName);
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        }
        catch (error) {
            this.logger.warn(`No se pudo cargar la plantilla base para ${templateType}: ${error.message}`);
            return '';
        }
    }
    async evaluateFit(vacancyDescription, candidateProfile, language = 'Español') {
        if (!this.genAI) {
            throw new Error('El cliente de Gemini no está inicializado. Verifica tu GEMINI_API_KEY.');
        }
        try {
            const systemContext = await this.loadSystemPrompt('rank.md');
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-3.1-flash-lite',
                systemInstruction: systemContext || undefined,
            });
            const userPrompt = `
Deberás evaluar el perfil del candidato respecto a la vacante y retornar un objeto JSON con dos propiedades obligatorias: 
1. "score" (un número entero del 0 al 100 indicando el nivel de ajuste).
2. "analysis" (un análisis cualitativo detallando fortalezas, debilidades y brechas de habilidades en formato string).

Tanto la evaluación como el análisis cualitativo deben estar escritos en el idioma: ${language}.

DESCRIPCIÓN DE LA VACANTE:
${vacancyDescription}

PERFIL DEL CANDIDATO:
${candidateProfile}

Escribe tu respuesta estrictamente en el formato JSON requerido.
`;
            this.logger.log('Iniciando evaluación de ajuste con Gemini (Output JSON esperado)...');
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                },
            });
            const response = await result.response;
            const responseText = response.text();
            try {
                const parsed = JSON.parse(responseText);
                if (typeof parsed.score !== 'number' || typeof parsed.analysis !== 'string') {
                    throw new Error('Estructura de JSON inválida devuelta por el modelo.');
                }
                return parsed;
            }
            catch (jsonErr) {
                this.logger.error(`Error al parsear respuesta JSON de Gemini: ${jsonErr.message}. Respuesta original: ${responseText}`);
                throw new Error(`Respuesta de IA con formato JSON inválido: ${responseText}`);
            }
        }
        catch (error) {
            this.logger.error(`Error en evaluateFit: ${error.message}`);
            throw error;
        }
    }
    async draftLatex(vacancyDescription, candidateProfile, templateType, language = 'Español') {
        if (!this.genAI) {
            throw new Error('El cliente de Gemini no está inicializado. Verifica tu GEMINI_API_KEY.');
        }
        try {
            const systemContext = await this.loadSystemPrompt('apply.md');
            const baseTemplate = await this.loadTemplate(templateType);
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-3.1-flash-lite',
                systemInstruction: systemContext || undefined,
            });
            const userPrompt = `
Genera el código LaTeX puro para un ${templateType === 'cv' ? 'Currículum Vitae (CV)' : 'Carta de Presentación'} adaptado al perfil del candidato y a los requerimientos de la vacante.
Debes basarte estrictamente en la estructura, paquetes de LaTeX, fuentes, comandos personalizados y diseño de la plantilla proporcionada abajo. Solo rellena o modifica el contenido de texto para alinearlo a la postulación sin alterar los estilos base o provocar errores de compilación.

DESCRIPCIÓN DE LA VACANTE:
${vacancyDescription}

PERFIL DEL CANDIDATO:
${candidateProfile}

PLANTILLA LATEX BASE DE REFERENCIA:
${baseTemplate}

REGLAS CRÍTICAS DE SALIDA:
1. Retorna ÚNICAMENTE código LaTeX válido y compilable.
2. NO incluyas explicaciones en español ni encierres la respuesta con bloques de código markdown como \`\`\`latex. La respuesta debe comenzar directamente con \\documentclass u otra instrucción de inicio de LaTeX.
3. Asegúrate de mantener todos los comandos de diseño y fonts cargados en la plantilla.

CRITICAL RULES:
1. ENTIRE OUTPUT MUST BE STRICTLY WRITTEN IN ${language}.
2. DO NOT HALLUCINATE OR INVENT EXPERIENCE, DEGREES, OR LOCATIONS. Base the CV and Cover Letter ONLY on the provided candidate profile. If the candidate lacks specific years of experience, highlight their real projects and skills instead of fabricating work history.
`;
            this.logger.log(`Generando borrador de LaTeX para ${templateType} con Gemini (Modelo con plantilla inyectada)...`);
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            });
            const response = await result.response;
            let text = response.text();
            if (text.includes('```')) {
                text = text.replace(/```latex/g, '').replace(/```/g, '').trim();
            }
            if (templateType === 'cv') {
                text = text.replace(/\\usepackage\[?[^\]]*\]?{hyperref}/g, '% \\usepackage{hyperref} (evitado clash con la clase moderncv)');
                if (text.includes('\\hypersetup') && !text.includes('\\AtBeginDocument')) {
                    text = text.replace(/\\hypersetup\s*\{([^}]*)\}/gs, '\\AtBeginDocument{\\hypersetup{$1}}');
                }
            }
            text = text.replace(/(?<!\\)&/g, '\\&');
            return text;
        }
        catch (error) {
            this.logger.error(`Error en draftLatex: ${error.message}`);
            throw error;
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map