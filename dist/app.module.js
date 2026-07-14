"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const test_command_1 = require("./test.command");
const latex_module_1 = require("./latex/latex.module");
const database_module_1 = require("./database/database.module");
const storage_module_1 = require("./storage/storage.module");
const ai_module_1 = require("./ai/ai.module");
const commands_module_1 = require("./commands/commands.module");
const scraper_module_1 = require("./scraper/scraper.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'better-sqlite3',
                database: 'job_search.sqlite',
                autoLoadEntities: true,
                synchronize: true,
            }),
            database_module_1.DatabaseModule,
            latex_module_1.LatexModule,
            storage_module_1.StorageModule,
            ai_module_1.AiModule,
            commands_module_1.CommandsModule,
            scraper_module_1.ScraperModule,
        ],
        providers: [test_command_1.TestCommand],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map