"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LatexService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatexService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const util = require("util");
const os = require("os");
const path = require("path");
const fs = require("fs/promises");
const execPromise = util.promisify(child_process_1.exec);
let LatexService = LatexService_1 = class LatexService {
    constructor() {
        this.logger = new common_1.Logger(LatexService_1.name);
        this.dockerImageName = 'ai-job-search-latex';
    }
    handleDockerError(error) {
        const message = error.message || '';
        if (message.includes('docker daemon') ||
            message.includes('connect') ||
            message.includes('npipe') ||
            message.includes('cannot connect') ||
            message.includes('DockerDesktop') ||
            message.includes('daemon')) {
            throw new Error('Error: El servicio de Docker (Docker Desktop) no está en ejecución. Por favor, asegúrate de que Docker esté activo e inténtalo de nuevo.');
        }
        throw error;
    }
    async checkDockerImage() {
        try {
            await execPromise(`docker image inspect ${this.dockerImageName}`);
            return true;
        }
        catch (error) {
            try {
                this.handleDockerError(error);
            }
            catch (friendlyError) {
                if (friendlyError.message.includes('Docker Desktop')) {
                    throw friendlyError;
                }
            }
            return false;
        }
    }
    async buildDockerImage() {
        this.logger.log(`Construyendo la imagen de Docker: ${this.dockerImageName}...`);
        try {
            await execPromise(`docker build -t ${this.dockerImageName} .`);
            this.logger.log(`Imagen ${this.dockerImageName} construida con éxito.`);
        }
        catch (error) {
            this.handleDockerError(error);
        }
    }
    async compilePdf(filePath, engine = 'xelatex') {
        const absolutePath = path.resolve(filePath);
        const fileDir = path.dirname(absolutePath);
        const fileName = path.basename(absolutePath);
        const cwd = process.cwd();
        let relativeDir = path.relative(cwd, fileDir);
        relativeDir = relativeDir.replace(/\\/g, '/');
        const containerWd = relativeDir ? `/workspace/${relativeDir}` : '/workspace';
        let userFlag = '';
        if (os.platform() !== 'win32') {
            userFlag = '-u $(id -u):$(id -g)';
        }
        const command = `docker run --rm ${userFlag} -v "${cwd}:/workspace" -w "${containerWd}" ${this.dockerImageName} ${engine} "${fileName}"`;
        this.logger.log(`Compilando PDF usando ${engine} para el archivo: ${fileName} (dentro de ${containerWd})...`);
        try {
            const { stdout, stderr } = await execPromise(command);
            if (stdout)
                this.logger.log(`[STDOUT] ${stdout}`);
            if (stderr)
                this.logger.warn(`[STDERR] ${stderr}`);
            this.logger.log(`PDF compilado correctamente para: ${fileName}`);
        }
        catch (error) {
            try {
                this.handleDockerError(error);
            }
            catch (friendlyError) {
                if (friendlyError.message.includes('Docker Desktop')) {
                    throw friendlyError;
                }
            }
            this.logger.error(`Error al compilar el PDF de LaTeX: ${error.message}`);
            if (error.stdout)
                this.logger.error(`[STDOUT] ${error.stdout}`);
            if (error.stderr)
                this.logger.error(`[STDERR] ${error.stderr}`);
            throw new Error(`La compilación de LaTeX falló:\n${error.stderr || error.message}`);
        }
        finally {
            await this.cleanupAuxFiles(absolutePath);
        }
    }
    async cleanupAuxFiles(absoluteFilePath) {
        const ext = path.extname(absoluteFilePath);
        const baseWithoutExt = absoluteFilePath.substring(0, absoluteFilePath.length - ext.length);
        const extensionsToClean = ['.aux', '.log', '.out'];
        for (const cleanExt of extensionsToClean) {
            const fileToClean = `${baseWithoutExt}${cleanExt}`;
            try {
                await fs.unlink(fileToClean);
                this.logger.log(`Archivo auxiliar eliminado: ${path.basename(fileToClean)}`);
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    this.logger.warn(`No se pudo eliminar el archivo auxiliar ${path.basename(fileToClean)}: ${err.message}`);
                }
            }
        }
    }
};
exports.LatexService = LatexService;
exports.LatexService = LatexService = LatexService_1 = __decorate([
    (0, common_1.Injectable)()
], LatexService);
//# sourceMappingURL=latex.service.js.map