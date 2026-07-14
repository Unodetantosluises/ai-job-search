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
var ListCommand_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListCommand = void 0;
const nest_commander_1 = require("nest-commander");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const application_entity_1 = require("../database/entities/application.entity");
let ListCommand = ListCommand_1 = class ListCommand extends nest_commander_1.CommandRunner {
    constructor(applicationRepository) {
        super();
        this.applicationRepository = applicationRepository;
        this.logger = new common_1.Logger(ListCommand_1.name);
    }
    async run() {
        console.log('\n\x1b[36m===================================================');
        console.log('            HISTORIAL DE POSTULACIONES              ');
        console.log('===================================================\x1b[0m');
        try {
            const applications = await this.applicationRepository.find({
                relations: {
                    vacancy: true,
                    evaluation: true,
                },
                order: {
                    applied_at: 'DESC',
                },
            });
            if (applications.length === 0) {
                console.log('\n\x1b[33mEl historial de postulaciones está vacío.\x1b[0m');
                console.log('\x1b[36mUse "npm run cli -- scrape" o "npm run cli -- apply" para comenzar.\x1b[0m\n');
                return;
            }
            const mappedData = applications.map((app) => {
                const dateStr = app.applied_at
                    ? new Date(app.applied_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    })
                    : 'N/A';
                return {
                    ID: app.id,
                    Empresa: app.vacancy?.company || 'Desconocida',
                    Puesto: app.vacancy?.role || 'Desconocido',
                    Modalidad: app.vacancy?.location_type || 'No especificada',
                    Estado: app.status,
                    Score: app.evaluation ? `${app.evaluation.score}/100` : 'N/A',
                    Fecha: dateStr,
                };
            });
            console.table(mappedData);
            console.log(`\x1b[32mTotal: ${applications.length} postulaciones registradas.\x1b[0m\n`);
        }
        catch (err) {
            this.logger.error(`Error al listar el historial de postulaciones: ${err.message}`);
        }
    }
};
exports.ListCommand = ListCommand;
exports.ListCommand = ListCommand = ListCommand_1 = __decorate([
    (0, nest_commander_1.Command)({
        name: 'list',
        description: 'Listar todas las postulaciones guardadas y realizadas con sus detalles',
    }),
    __param(0, (0, typeorm_1.InjectRepository)(application_entity_1.Application)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ListCommand);
//# sourceMappingURL=list.command.js.map