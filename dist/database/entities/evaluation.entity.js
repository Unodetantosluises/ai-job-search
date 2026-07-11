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
exports.Evaluation = void 0;
const typeorm_1 = require("typeorm");
const application_entity_1 = require("./application.entity");
let Evaluation = class Evaluation {
};
exports.Evaluation = Evaluation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Evaluation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => application_entity_1.Application, (application) => application.evaluation, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'application_id' }),
    __metadata("design:type", application_entity_1.Application)
], Evaluation.prototype, "application", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Evaluation.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Evaluation.prototype, "fit_analysis", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Evaluation.prototype, "created_at", void 0);
exports.Evaluation = Evaluation = __decorate([
    (0, typeorm_1.Entity)('evaluations')
], Evaluation);
//# sourceMappingURL=evaluation.entity.js.map