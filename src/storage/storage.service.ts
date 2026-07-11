import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageRoot = path.resolve('local_storage', 'applications');

  /**
   * Sanitizes names to be safe for directory and file naming across Windows, Linux and macOS.
   */
  private sanitizeName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Quitar caracteres inválidos en OS
      .trim()
      .replace(/[\s\-]+/g, '_') // Espacios/guiones a guion bajo
      .replace(/_+/g, '_'); // Consolidar guiones bajos repetidos
  }

  /**
   * Moves/copies generated PDFs to a structured local directory: local_storage/applications/{company}_{role}/
   */
  async saveApplicationFiles(
    company: string,
    role: string,
    cvPath: string,
    coverLetterPath: string,
  ): Promise<{ cvDest: string; coverLetterDest: string }> {
    const sanitizedCompany = this.sanitizeName(company);
    const sanitizedRole = this.sanitizeName(role);
    
    const folderName = `${sanitizedCompany}_${sanitizedRole}`;
    const destinationDir = path.join(this.storageRoot, folderName);

    this.logger.log(`Creando carpeta de almacenamiento estructurado en: ${destinationDir}`);
    await fs.mkdir(destinationDir, { recursive: true });

    const cvDestName = `CV_${sanitizedCompany}_${sanitizedRole}.pdf`;
    const cvDestPath = path.join(destinationDir, cvDestName);

    const coverDestName = `CoverLetter_${sanitizedCompany}_${sanitizedRole}.pdf`;
    const coverLetterDestPath = path.join(destinationDir, coverDestName);

    // Copiar el CV si existe
    if (cvPath) {
      const resolvedCvPath = path.resolve(cvPath);
      this.logger.log(`Copiando CV desde ${resolvedCvPath} hacia ${cvDestPath}`);
      await fs.copyFile(resolvedCvPath, cvDestPath);
    }

    // Copiar la Carta de Presentación si existe
    if (coverLetterPath) {
      const resolvedCoverPath = path.resolve(coverLetterPath);
      this.logger.log(`Copiando Carta de Presentación desde ${resolvedCoverPath} hacia ${coverLetterDestPath}`);
      await fs.copyFile(resolvedCoverPath, coverLetterDestPath);
    }

    return {
      cvDest: cvDestPath,
      coverLetterDest: coverLetterDestPath,
    };
  }
}
