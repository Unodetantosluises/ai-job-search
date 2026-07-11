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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = exports.ApplicationStatus = void 0;
const typeorm_1 = require("typeorm");
const vacancy_entity_1 = require("./vacancy.entity");
const evaluation_entity_1 = require("./evaluation.entity");
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["EN_ESPERA"] = "EN_ESPERA";
    ApplicationStatus["ENVIADO"] = "ENVIADO";
    ApplicationStatus["ENTREVISTA"] = "ENTREVISTA";
    ApplicationStatus["RECHAZADO"] = "RECHAZADO";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
let Application = class Application {
};
exports.Application = Application;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Application.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => vacancy_entity_1.Vacancy, (vacancy) => vacancy.applications, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'vacancy_id' }),
    __metadata("design:type", vacancy_entity_1.Vacancy)
], Application.prototype, "vacancy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: ApplicationStatus.EN_ESPERA,
    }),
    __metadata("design:type", String)
], Application.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'applied_at' }),
    __metadata("design:type", Date)
], Application.prototype, "applied_at", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => evaluation_entity_1.Evaluation, (evaluation) => evaluation.application),
    __metadata("design:type", evaluation_entity_1.Evaluation)
], Application.prototype, "evaluation", void 0);
exports.Application = Application = __decorate([
    (0, typeorm_1.Entity)('applications')
], Application);
//# sourceMappingURL=application.entity.js.map