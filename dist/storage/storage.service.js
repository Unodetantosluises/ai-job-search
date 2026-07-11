"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs/promises");
const path = require("path");
let StorageService = StorageService_1 = class StorageService {
    constructor() {
        this.logger = new common_1.Logger(StorageService_1.name);
        this.storageRoot = path.resolve('local_storage', 'applications');
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
    async saveApplicationFiles(company, role, cvPath, coverLetterPath) {
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
        if (cvPath) {
            const resolvedCvPath = path.resolve(cvPath);
            this.logger.log(`Copiando CV desde ${resolvedCvPath} hacia ${cvDestPath}`);
            await fs.copyFile(resolvedCvPath, cvDestPath);
        }
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
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)()
], StorageService);
//# sourceMappingURL=storage.service.js.map