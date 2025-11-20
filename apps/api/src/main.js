"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const express = __importStar(require("express"));
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
const app_module_1 = require("./app.module");
const fs_1 = require("fs");
const envPath = path_1.default.join(__dirname, '..', '..', '.env');
if ((0, fs_1.existsSync)(envPath)) {
    (0, dotenv_1.config)({ path: envPath, override: true });
}
else {
    const cwdEnvPath = path_1.default.join(process.cwd(), '.env');
    if ((0, fs_1.existsSync)(cwdEnvPath)) {
        (0, dotenv_1.config)({ path: cwdEnvPath, override: true });
    }
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.use(express.json({ limit: '15mb' }));
    app.use(express.urlencoded({ limit: '15mb', extended: true }));
    app.enableCors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-API-Key',
            'X-Organization-Id',
        ],
    });
    app.enableVersioning({
        type: common_1.VersioningType.URI,
        defaultVersion: '1',
    });
    const port = process.env.PORT ?? 3333;
    const config = new swagger_1.DocumentBuilder()
        .setTitle('API Documentation')
        .setDescription('The API documentation for this application')
        .setVersion('1.0')
        .addApiKey({
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for authentication',
    }, 'apikey')
        .addServer('https://api.trycomp.ai', 'API Server')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        raw: ['json'],
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
    const server = await app.listen(port);
    const address = server.address();
    const actualPort = typeof address === 'string' ? port : address?.port || port;
    const actualUrl = `http://localhost:${actualPort}`;
    console.log(`Application is running on: ${actualUrl}`);
    console.log(`API Documentation available at: ${actualUrl}/api/docs`);
    if (process.env.NODE_ENV !== 'production') {
        const openapiPath = path_1.default.join(__dirname, '../../../../packages/docs/openapi.json');
        const docsDir = path_1.default.dirname(openapiPath);
        if (!(0, fs_1.existsSync)(docsDir)) {
            (0, fs_1.mkdirSync)(docsDir, { recursive: true });
        }
        (0, fs_1.writeFileSync)(openapiPath, JSON.stringify(document, null, 2));
        console.log('OpenAPI documentation written to packages/docs/openapi.json');
    }
}
void bootstrap().catch((error) => {
    console.error('Error starting application:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map