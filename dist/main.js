"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nest_commander_1 = require("nest-commander");
const app_module_1 = require("./app.module");
const dotenv = require("dotenv");
dotenv.config();
async function bootstrap() {
    await nest_commander_1.CommandFactory.run(app_module_1.AppModule, ['log', 'error', 'warn']);
}
bootstrap();
//# sourceMappingURL=main.js.map