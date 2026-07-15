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
var StatusCommand_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusCommand = void 0;
const nest_commander_1 = require("nest-commander");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const application_entity_1 = require("../database/entities/application.entity");
let StatusCommand = StatusCommand_1 = class StatusCommand extends nest_commander_1.CommandRunner {
    constructor(applicationRepository) {
        super();
        this.applicationRepository = applicationRepository;
        this.logger = new common_1.Logger(StatusCommand_1.name);
    }
    async run(inputs, options) {
        console.log('\n\x1b[36m===================================================');
        console.log('         ACTUALIZAR ESTADO DE POSTULACIÓN          ');
        console.log('===================================================\x1b[0m');
        const id = options.id;
        const rawStatus = options.status;
        if (id === undefined || id === null) {
            console.error('\x1b[31m[ERROR]: Debes ingresar el ID de la postulación usando el flag -i o --id.\x1b[0m');
            return;
        }
        if (!rawStatus) {
            console.error('\x1b[31m[ERROR]: Debes ingresar el nuevo estado usando el flag -s o --status.\x1b[0m');
            return;
        }
        const newStatus = rawStatus.trim().toUpperCase();
        const validStatuses = ['EN_ESPERA', 'ENVIADO', 'ENTREVISTA', 'RECHAZADO'];
        if (!validStatuses.includes(newStatus)) {
            console.error(`\x1b[31m[ERROR]: El estado "${rawStatus}" no es válido.\x1b[0m`);
            console.log('\x1b[33mEstados válidos permitidos:\x1b[0m');
            console.log('  - EN_ESPERA');
            console.log('  - ENVIADO');
            console.log('  - ENTREVISTA');
            console.log('  - RECHAZADO\n');
            return;
        }
        try {
            const app = await this.applicationRepository.findOne({
                where: { id },
                relations: { vacancy: true },
            });
            if (!app) {
                console.error(`\x1b[31m[ERROR]: No se encontró ninguna postulación con el ID ${id}.\x1b[0m\n`);
                return;
            }
            const oldStatus = app.status;
            app.status = newStatus;
            await this.applicationRepository.save(app);
            console.log('\n\x1b[32m===================================================');
            console.log('¡ÉXITO! Estado de postulación actualizado.');
            console.log(`Empresa:      ${app.vacancy?.company || 'Desconocida'}`);
            console.log(`Puesto:       ${app.vacancy?.role || 'Desconocido'}`);
            console.log(`Estado viejo: ${oldStatus}`);
            console.log(`Estado nuevo: ${newStatus}`);
            console.log('===================================================\x1b[0m\n');
        }
        catch (err) {
            this.logger.error(`Error al actualizar el estado de la postulación: ${err.message}`);
        }
    }
    parseId(val) {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
            throw new Error('El ID de la postulación debe ser un número entero válido.');
        }
        return parsed;
    }
    parseStatus(val) {
        return val;
    }
};
exports.StatusCommand = StatusCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-i, --id <id>',
        description: 'ID de la postulación a modificar',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Number)
], StatusCommand.prototype, "parseId", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-s, --status <status>',
        description: 'Nuevo estado a asignar (EN_ESPERA, ENVIADO, ENTREVISTA, RECHAZADO)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], StatusCommand.prototype, "parseStatus", null);
exports.StatusCommand = StatusCommand = StatusCommand_1 = __decorate([
    (0, nest_commander_1.Command)({
        name: 'status',
        description: 'Actualizar el estado de una postulación en la base de datos por su ID',
    }),
    __param(0, (0, typeorm_1.InjectRepository)(application_entity_1.Application)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StatusCommand);
//# sourceMappingURL=status.command.js.map