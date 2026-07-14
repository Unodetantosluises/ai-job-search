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
exports.SetupCommand = void 0;
const nest_commander_1 = require("nest-commander");
const common_1 = require("@nestjs/common");
const ai_service_1 = require("../ai/ai.service");
const fs = require("fs/promises");
const path = require("path");
const pdf_parse_1 = require("pdf-parse");
let SetupCommand = SetupCommand_1 = class SetupCommand extends nest_commander_1.CommandRunner {
    constructor(aiService) {
        super();
        this.aiService = aiService;
        this.logger = new common_1.Logger(SetupCommand_1.name);
    }
    async run() {
        console.log('\n\x1b[36m===================================================');
        console.log('         INICIANDO PROCESO DE SETUP (PERFIL)         ');
        console.log('===================================================\x1b[0m');
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
                if (!stat.isDirectory()) {
                    continue;
                }
                this.logger.log(`Escaneando carpeta: ${folder}`);
                const files = await fs.readdir(folderPath);
                for (const file of files) {
                    const filePath = path.join(folderPath, file);
                    const fileStat = await fs.stat(filePath);
                    if (!fileStat.isFile()) {
                        continue;
                    }
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
            console.error('\n\x1b[31m[ERROR]: No se encontraron documentos válidos (.pdf, .txt, .md) en las carpetas de origen.\x1b[0m');
            console.error('\x1b[33mPor favor, coloca tus documentos en alguna de las siguientes carpetas:\x1b[0m');
            folders.forEach((f) => console.error(`  - ${f}/`));
            console.log('\x1b[36m===================================================\x1b[0m\n');
            return;
        }
        try {
            this.logger.log('Enviando texto extraído a Gemini para estructurar el perfil...');
            const markdownProfile = await this.aiService.buildCandidateProfile(fullRawText);
            const outputPath = path.join(process.cwd(), 'docs_prompts', 'skills', 'job-application-assistant', '01-candidate-profile.md');
            const outputDir = path.dirname(outputPath);
            this.logger.log(`Garantizando existencia del directorio destino: ${outputDir}`);
            await fs.mkdir(outputDir, { recursive: true });
            this.logger.log(`Guardando perfil estructurado en: ${outputPath}`);
            await fs.writeFile(outputPath, markdownProfile, 'utf-8');
            console.log('\n\x1b[32m===================================================');
            console.log('¡ÉXITO! Perfil del candidato generado correctamente.');
            console.log(`Guardado en: ${outputPath}`);
            console.log('===================================================\x1b[0m\n');
        }
        catch (apiErr) {
            this.logger.error(`Error durante la generación del perfil por IA: ${apiErr.message}`);
        }
    }
};
exports.SetupCommand = SetupCommand;
exports.SetupCommand = SetupCommand = SetupCommand_1 = __decorate([
    (0, nest_commander_1.Command)({
        name: 'setup',
        description: 'Automatizar la creación del perfil del candidato leyendo sus documentos locales y estructurándolos',
    }),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], SetupCommand);
//# sourceMappingURL=setup.command.js.map