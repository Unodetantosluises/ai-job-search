import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Vacancy } from '../database/entities/vacancy.entity';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY no está definida en las variables de entorno o archivo .env.');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Helper to load system prompt instructions from docs_prompts/commands/
   */
  private async loadSystemPrompt(fileName: string): Promise<string> {
    try {
      const filePath = path.join(process.cwd(), 'docs_prompts', 'commands', fileName);
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      this.logger.warn(`No se pudo cargar el prompt del archivo docs_prompts/commands/${fileName}: ${error.message}`);
      return '';
    }
  }

  /**
   * Helper to load template contents
   */
  private async loadTemplate(templateType: 'cv' | 'cover_letter'): Promise<string> {
    try {
      const fileName = templateType === 'cv' 
        ? path.join('cv', 'main_example.tex') 
        : path.join('cover_letters', 'cover_example.tex');
      const filePath = path.join(process.cwd(), fileName);
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      this.logger.warn(`No se pudo cargar la plantilla base para ${templateType}: ${error.message}`);
      return '';
    }
  }

  /**
   * Evaluates the fit between a candidate profile and a vacancy description.
   * Returns a JSON object with score and analysis.
   */
  async evaluateFit(
    vacancyDescription: string,
    candidateProfile?: string,
    language: string = 'Español',
  ): Promise<{ score: number; analysis: string }> {
    if (!this.genAI) {
      throw new Error('El cliente de Gemini no está inicializado. Verifica tu GEMINI_API_KEY.');
    }

    try {
      const systemContext = await this.loadSystemPrompt('rank.md');

      // Leer obligatoriamente el perfil desde el archivo unificado
      const profilePath = path.join(
        process.cwd(),
        'docs_prompts',
        'skills',
        'job-application-assistant',
        '01-candidate-profile.md',
      );
      let finalProfile = '';
      try {
        finalProfile = await fs.readFile(profilePath, 'utf-8');
      } catch (err) {
        this.logger.warn(`No se pudo leer el perfil unificado de 01-candidate-profile.md: ${err.message}. Se usará el parámetro provisto.`);
        finalProfile = candidateProfile || '';
      }
      
      // Pasar systemInstruction de forma nativa en la configuración del modelo
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
        return parsed as { score: number; analysis: string };
      } catch (jsonErr) {
        this.logger.error(`Error al parsear respuesta JSON de Gemini: ${jsonErr.message}. Respuesta original: ${responseText}`);
        throw new Error(`Respuesta de IA con formato JSON inválido: ${responseText}`);
      }
    } catch (error) {
      this.logger.error(`Error en evaluateFit: ${error.message}`);
      throw error;
    }
  }

  /**
   * Drafts a LaTeX document (CV or Cover Letter) based on candidate profile and vacancy.
   * Injects the base LaTeX template to enforce structural consistency.
   */
  async draftLatex(
    vacancyDescription: string,
    candidateProfile: string | undefined,
    templateType: 'cv' | 'cover_letter',
    language: string = 'Español',
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('El cliente de Gemini no está inicializado. Verifica tu GEMINI_API_KEY.');
    }

    try {
      const systemContext = await this.loadSystemPrompt('apply.md');
      const baseTemplate = await this.loadTemplate(templateType);

      // Leer obligatoriamente el perfil desde el archivo unificado
      const profilePath = path.join(
        process.cwd(),
        'docs_prompts',
        'skills',
        'job-application-assistant',
        '01-candidate-profile.md',
      );
      let finalProfile = '';
      try {
        finalProfile = await fs.readFile(profilePath, 'utf-8');
      } catch (err) {
        this.logger.warn(`No se pudo leer el perfil unificado de 01-candidate-profile.md: ${err.message}. Se usará el parámetro provisto.`);
        finalProfile = candidateProfile || '';
      }

      // Pasar systemInstruction de forma nativa en la configuración del modelo
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

      // Sanitizar bloques de código markdown si el modelo los genera
      if (text.includes('```')) {
        text = text.replace(/```latex/g, '').replace(/```/g, '').trim();
      }

      // Evitar clashes de hyperref en moderncv (CV)
      if (templateType === 'cv') {
        text = text.replace(/\\usepackage\[?[^\]]*\]?{hyperref}/g, '% \\usepackage{hyperref} (evitado clash con la clase moderncv)');
        
        // Envolver \hypersetup en \AtBeginDocument si no lo está ya, para evitar errores en moderncv
        if (text.includes('\\hypersetup') && !text.includes('\\AtBeginDocument')) {
          text = text.replace(/\\hypersetup\s*\{([^}]*)\}/gs, '\\AtBeginDocument{\\hypersetup{$1}}');
        }
      }

      // Escapar caracteres '&' que el modelo suele generar sin escapar (ej. "CI/CD & Docker" -> "CI/CD \& Docker")
      text = text.replace(/(?<!\\)&/g, '\\&');

      return text;
    } catch (error) {
      this.logger.error(`Error en draftLatex: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generates a unified, structured candidate profile in Markdown format based on raw documents text.
   */
  async buildCandidateProfile(rawText: string): Promise<string> {
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

      // Sanitizar bloques de código markdown si el modelo los envuelve en ```markdown
      if (text.includes('```')) {
        text = text.replace(/```markdown/g, '').replace(/```/g, '').trim();
      }

      return text;
    } catch (error) {
      this.logger.error(`Error en buildCandidateProfile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera un paquete de preparación de entrevista estructurado en base a la vacante, el CV y la carta.
   */
  async generatePrepPack(
    vacancy: Vacancy,
    cvContent: string,
    coverLetterContent: string,
    stageDetails: string,
  ): Promise<string> {
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
    // Sanitizar posibles bloques de código markdown
    if (text.startsWith('```markdown')) {
      text = text.substring(11);
      if (text.endsWith('```')) {
        text = text.substring(0, text.length - 3);
      }
    } else if (text.startsWith('```')) {
      text = text.substring(3);
      if (text.endsWith('```')) {
        text = text.substring(0, text.length - 3);
      }
    }
    return text.trim();
  }

  /**
   * Inicia una sesión de chat interactiva para simular una entrevista.
   */
  async startMockInterviewSession(systemInstruction: string) {
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
}
