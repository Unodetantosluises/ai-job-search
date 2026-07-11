import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as util from 'util';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

const execPromise = util.promisify(exec);

@Injectable()
export class LatexService {
  private readonly logger = new Logger(LatexService.name);
  private readonly dockerImageName = 'ai-job-search-latex';

  /**
   * Helper to identify and map Docker Daemon errors to a user-friendly message.
   */
  private handleDockerError(error: any): never {
    const message = error.message || '';
    if (
      message.includes('docker daemon') ||
      message.includes('connect') ||
      message.includes('npipe') ||
      message.includes('cannot connect') ||
      message.includes('DockerDesktop') ||
      message.includes('daemon')
    ) {
      throw new Error(
        'Error: El servicio de Docker (Docker Desktop) no está en ejecución. Por favor, asegúrate de que Docker esté activo e inténtalo de nuevo.'
      );
    }
    throw error;
  }

  /**
   * Verifies if the LaTeX compiler Docker image exists.
   */
  async checkDockerImage(): Promise<boolean> {
    try {
      await execPromise(`docker image inspect ${this.dockerImageName}`);
      return true;
    } catch (error) {
      // Si la imagen simplemente no existe, devuelve false.
      // Si hay un fallo de conexión con Docker, se captura y se lanza el error amigable.
      try {
        this.handleDockerError(error);
      } catch (friendlyError) {
        if (friendlyError.message.includes('Docker Desktop')) {
          throw friendlyError;
        }
      }
      return false;
    }
  }

  /**
   * Builds the Docker image 'ai-job-search-latex' using the local Dockerfile.
   */
  async buildDockerImage(): Promise<void> {
    this.logger.log(`Construyendo la imagen de Docker: ${this.dockerImageName}...`);
    try {
      await execPromise(`docker build -t ${this.dockerImageName} .`);
      this.logger.log(`Imagen ${this.dockerImageName} construida con éxito.`);
    } catch (error) {
      this.handleDockerError(error);
    }
  }

  /**
   * Compiles a .tex file to PDF using XeTeX or LuaTeX in an ephemeral Docker container.
   */
  async compilePdf(filePath: string, engine: 'lualatex' | 'xelatex' = 'xelatex'): Promise<void> {
    const absolutePath = path.resolve(filePath);
    const fileDir = path.dirname(absolutePath);
    const fileName = path.basename(absolutePath);
    const cwd = process.cwd();
    
    // Obtener ruta relativa del directorio para establecer el working directory del contenedor
    let relativeDir = path.relative(cwd, fileDir);
    relativeDir = relativeDir.replace(/\\/g, '/');
    const containerWd = relativeDir ? `/workspace/${relativeDir}` : '/workspace';

    // Determinar la bandera de usuario para Linux/macOS
    let userFlag = '';
    if (os.platform() !== 'win32') {
      userFlag = '-u $(id -u):$(id -g)';
    }

    const command = `docker run --rm ${userFlag} -v "${cwd}:/workspace" -w "${containerWd}" ${this.dockerImageName} ${engine} "${fileName}"`;

    this.logger.log(`Compilando PDF usando ${engine} para el archivo: ${fileName} (dentro de ${containerWd})...`);
    
    try {
      const { stdout, stderr } = await execPromise(command);
      if (stdout) this.logger.log(`[STDOUT] ${stdout}`);
      if (stderr) this.logger.warn(`[STDERR] ${stderr}`);
      this.logger.log(`PDF compilado correctamente para: ${fileName}`);
    } catch (error) {
      // Capturar fallos del Docker daemon primero
      try {
        this.handleDockerError(error);
      } catch (friendlyError) {
        if (friendlyError.message.includes('Docker Desktop')) {
          throw friendlyError;
        }
      }

      this.logger.error(`Error al compilar el PDF de LaTeX: ${error.message}`);
      if (error.stdout) this.logger.error(`[STDOUT] ${error.stdout}`);
      if (error.stderr) this.logger.error(`[STDERR] ${error.stderr}`);
      throw new Error(`La compilación de LaTeX falló:\n${error.stderr || error.message}`);
    } finally {
      // Limpiar archivos auxiliares independientemente del resultado
      await this.cleanupAuxFiles(absolutePath);
    }
  }

  /**
   * Cleans up LaTeX auxiliary files (.aux, .log, .out) generated during compilation.
   */
  private async cleanupAuxFiles(absoluteFilePath: string): Promise<void> {
    const ext = path.extname(absoluteFilePath);
    const baseWithoutExt = absoluteFilePath.substring(0, absoluteFilePath.length - ext.length);
    const extensionsToClean = ['.aux', '.log', '.out'];
    
    for (const cleanExt of extensionsToClean) {
      const fileToClean = `${baseWithoutExt}${cleanExt}`;
      try {
        await fs.unlink(fileToClean);
        this.logger.log(`Archivo auxiliar eliminado: ${path.basename(fileToClean)}`);
      } catch (err) {
        // Ignorar si el archivo no existe (código ENOENT)
        if (err.code !== 'ENOENT') {
          this.logger.warn(`No se pudo eliminar el archivo auxiliar ${path.basename(fileToClean)}: ${err.message}`);
        }
      }
    }
  }
}
