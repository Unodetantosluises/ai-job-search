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
            const profilePath = path.join(process.cwd(), 'docs_prompts', 'skills', 'job-application-assistant', '01-candidate-profile.md');
            let finalProfile = '';
            try {
                finalProfile = await fs.readFile(profilePath, 'utf-8');
            }
            catch (err) {
                this.logger.warn(`No se pudo leer el perfil unificado de 01-candidate-profile.md: ${err.message}. Se usará el parámetro provisto.`);
                finalProfile = candidateProfile || '';
            }
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
${finalProfile}

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
            const profilePath = path.join(process.cwd(), 'docs_prompts', 'skills', 'job-application-assistant', '01-candidate-profile.md');
            let finalProfile = '';
            try {
                finalProfile = await fs.readFile(profilePath, 'utf-8');
            }
            catch (err) {
                this.logger.warn(`No se pudo leer el perfil unificado de 01-candidate-profile.md: ${err.message}. Se usará el parámetro provisto.`);
                finalProfile = candidateProfile || '';
            }
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
${finalProfile}

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
    async buildCandidateProfile(rawText) {
        if (!this.genAI) {
            throw new Error('El cliente de Gemini no está inicializado. Verifica tu GEMINI_API_KEY.');
        }
        try {
            const systemInstruction = `Eres un analizador de perfiles profesionales. Tu tarea es leer el texto extraído de los documentos del candidato y generar un perfil estructurado y detallado en formato Markdown. Organiza la información en secciones claras: Resumen, Experiencia Laboral, Proyectos, Educación, Habilidades Duras y Blandas. NO inventes información. Si no hay datos sobre algo, omítelo.`;
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-3.1-flash-lite',
                systemInstruction,
            });
            const userPrompt = `
A continuación se presenta el texto consolidado extraído de los documentos del candidato. Por favor, analízalo y genera el perfil estructurado en formato Markdown.

DOCUMENTOS DEL CANDIDATO (TEXTO EXTRAÍDO):
${rawText}
`;
            this.logger.log('Generando perfil unificado del candidato con Gemini...');
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            });
            const response = await result.response;
            let text = response.text();
            if (text.includes('```')) {
                text = text.replace(/```markdown/g, '').replace(/```/g, '').trim();
            }
            return text;
        }
        catch (error) {
            this.logger.error(`Error en buildCandidateProfile: ${error.message}`);
            throw error;
        }
    }
    async generatePrepPack(vacancy, cvContent, coverLetterContent, stageDetails) {
        this.logger.log('Generando paquete de preparación de entrevista con Gemini...');
        const systemInstruction = `Eres un preparador de entrevistas experto y un reclutador técnico experimentado. Tu tarea es generar un documento de preparación ("Prep Pack") detallado y altamente personalizado para el candidato.
Deberás basarte estrictamente en la información provista en la descripción de la vacante, el CV del candidato y su carta de presentación.
Bajo ninguna circunstancia debes inventar (alucinar) habilidades, certificaciones, puestos de trabajo, clientes, proyectos o años de experiencia que no estén detallados en el CV o la carta.
Responde en el mismo idioma que el detalle de la etapa y los documentos (normalmente español).`;
        const model = this.genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite',
            systemInstruction,
        });
        const userPrompt = `
Genera un paquete de preparación ("Prep Pack") estructurado en formato Markdown para la siguiente etapa de entrevista.

DETALLES DE LA ETAPA DE ENTREVISTA:
${stageDetails}

DATOS DE LA VACANTE:
- Empresa: ${vacancy.company}
- Puesto: ${vacancy.role}
- Modalidad: ${vacancy.location_type}
- Descripción:
${vacancy.description}

CV DEL CANDIDATO (LaTeX):
${cvContent}

CARTA DE PRESENTACIÓN (LaTeX):
${coverLetterContent}

El documento Markdown que generes DEBE incluir las siguientes secciones obligatorias:
1. **Análisis de la Vacante y Expectativas**: Qué buscarán evaluar en esta etapa específica.
2. **Preguntas Probables y Respuestas Sugeridas**: Preguntas de comportamiento y técnicas que podrían hacerte, alineadas con tu CV.
3. **Mapeo STAR**: Adapta la técnica STAR (Situación, Tarea, Acción, Resultado) utilizando los proyectos y experiencias reales de tu CV para responder a preguntas de comportamiento clave.
4. **Preguntas Inteligentes para el Entrevistador**: Sugiere 3 a 5 preguntas estratégicas que el candidato puede hacer sobre el puesto, la cultura o la tecnología al final de la entrevista.
`;
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        });
        let text = result.response.text();
        if (text.startsWith('```markdown')) {
            text = text.substring(11);
            if (text.endsWith('```')) {
                text = text.substring(0, text.length - 3);
            }
        }
        else if (text.startsWith('```')) {
            text = text.substring(3);
            if (text.endsWith('```')) {
                text = text.substring(0, text.length - 3);
            }
        }
        return text.trim();
    }
    async startMockInterviewSession(systemInstruction) {
        this.logger.log('Iniciando sesión de chat interactiva para simulacro de entrevista...');
        const model = this.genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite',
            systemInstruction,
        });
        const chat = model.startChat({
            history: [],
        });
        return chat;
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map