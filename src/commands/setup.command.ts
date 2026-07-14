import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';

@Command({
  name: 'setup',
  description: 'Automatizar la creación del perfil del candidato leyendo sus documentos locales y estructurándolos',
})
export class SetupCommand extends CommandRunner {
  private readonly logger = new Logger(SetupCommand.name);

  constructor(private readonly aiService: AiService) {
    super();
  }

  async run(): Promise<void> {
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
              // Leer buffer crudo (SIN encoding para que pdf-parse reciba el Buffer correcto)
              const dataBuffer = await fs.readFile(filePath);
              const parser = new PDFParse({ data: dataBuffer });
              const result = await parser.getText();
              if (result.text) {
                fullRawText += `\n--- CONTENIDO DOCUMENTO (${file}) ---\n${result.text}\n`;
              }
            } catch (pdfErr) {
              this.logger.error(`Error al procesar el archivo PDF ${file}: ${pdfErr.message}`);
            }
          } else if (ext === '.txt' || ext === '.md') {
            this.logger.log(`Leyendo archivo de texto: ${file}`);
            try {
              const textContent = await fs.readFile(filePath, 'utf-8');
              fullRawText += `\n--- CONTENIDO DOCUMENTO (${file}) ---\n${textContent}\n`;
            } catch (txtErr) {
              this.logger.error(`Error al leer el archivo de texto ${file}: ${txtErr.message}`);
            }
          }
        }
      } catch (err) {
        this.logger.debug(`Carpeta ${folder} no escaneada o inexistente: ${err.message}`);
      }
    }

    if (!fullRawText.trim()) {
      console.error(
        '\n\x1b[31m[ERROR]: No se encontraron documentos válidos (.pdf, .txt, .md) en las carpetas de origen.\x1b[0m',
      );
      console.error(
        '\x1b[33mPor favor, coloca tus documentos en alguna de las siguientes carpetas:\x1b[0m',
      );
      folders.forEach((f) => console.error(`  - ${f}/`));
      console.log('\x1b[36m===================================================\x1b[0m\n');
      return;
    }

    try {
      this.logger.log('Enviando texto extraído a Gemini para estructurar el perfil...');
      const markdownProfile = await this.aiService.buildCandidateProfile(fullRawText);

      const outputPath = path.join(
        process.cwd(),
        'docs_prompts',
        'skills',
        'job-application-assistant',
        '01-candidate-profile.md',
      );

      // Crear directorios recursivamente para evitar ENOENT
      const outputDir = path.dirname(outputPath);
      this.logger.log(`Garantizando existencia del directorio destino: ${outputDir}`);
      await fs.mkdir(outputDir, { recursive: true });

      // Guardar el perfil Markdown
      this.logger.log(`Guardando perfil estructurado en: ${outputPath}`);
      await fs.writeFile(outputPath, markdownProfile, 'utf-8');

      console.log('\n\x1b[32m===================================================');
      console.log('¡ÉXITO! Perfil del candidato generado correctamente.');
      console.log(`Guardado en: ${outputPath}`);
      console.log('===================================================\x1b[0m\n');
    } catch (apiErr) {
      this.logger.error(`Error durante la generación del perfil por IA: ${apiErr.message}`);
    }
  }
}
