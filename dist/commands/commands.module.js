"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const apply_command_1 = require("./apply.command");
const setup_command_1 = require("./setup.command");
const scrape_command_1 = require("./scrape.command");
const list_command_1 = require("./list.command");
const ai_module_1 = require("../ai/ai.module");
const latex_module_1 = require("../latex/latex.module");
const storage_module_1 = require("../storage/storage.module");
const scraper_module_1 = require("../scraper/scraper.module");
const vacancy_entity_1 = require("../database/entities/vacancy.entity");
const application_entity_1 = require("../database/entities/application.entity");
const evaluation_entity_1 = require("../database/entities/evaluation.entity");
let CommandsModule = class CommandsModule {
};
exports.CommandsModule = CommandsModule;
exports.CommandsModule = CommandsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([vacancy_entity_1.Vacancy, application_entity_1.Application, evaluation_entity_1.Evaluation]),
            ai_module_1.AiModule,
            latex_module_1.LatexModule,
            storage_module_1.StorageModule,
            scraper_module_1.ScraperModule,
        ],
        providers: [
            apply_command_1.ApplyCommand,
            apply_command_1.ApplyQuestions,
            apply_command_1.ConfirmQuestions,
            setup_command_1.SetupCommand,
            scrape_command_1.ScrapeCommand,
            scrape_command_1.ScrapeConfirmQuestions,
            list_command_1.ListCommand,
        ],
    })
], CommandsModule);
//# sourceMappingURL=commands.module.js.map