# AI Job Search CLI (NestJS + Gemini)

Esta es una herramienta de línea de comandos (CLI) moderna y extensible para la búsqueda de empleo con Inteligencia Artificial, construida con **NestJS**, **nest-commander**, la **API de Gemini (Google)** y **Docker**.

## Características

- **Gestión de CV y Cartas de Presentación**: Organiza y optimiza tu perfil profesional y cartas de presentación en `cv/` y `cover_letters/`.
- **Búsqueda de Salarios**: Herramientas integradas para consultar estimaciones salariales y tendencias.
- **Compilación de PDF**: Soporte para compilar documentos de LaTeX a PDF a través de un entorno Dockerizado completo.
- **Comandos Extensibles**: Estructura basada en NestJS y `nest-commander` para agregar comandos de forma modular.

## Requisitos Previos

- Node.js (v20 o superior recomendado, verificado con v22)
- Docker (opcional, para compilación remota/local de LaTeX sin instalar dependencias locales)
- Una clave de API de Gemini (`GEMINI_API_KEY`)

## Configuración

1. Clonar el repositorio y navegar a la carpeta:
   ```bash
   git clone <repo-url>
   cd ai-job-search
   ```
2. Instalar las dependencias:
   ```bash
   npm install
   ```
3. Configurar la clave API de Gemini:
   Crea un archivo `.env` o define la variable de entorno:
   ```bash
   GEMINI_API_KEY=tu_api_key_aqui
   ```

## Uso

Para ejecutar el CLI en desarrollo:
```bash
npm run cli -- <nombre-comando> [opciones]
```

Por ejemplo, para ejecutar el comando de prueba:
```bash
npm run cli -- test
```

## Compilación para Producción

Para compilar el proyecto:
```bash
npm run build
```

Ejecutar la compilación de producción:
```bash
npm start
```
o bien usar el script `cli`:
```bash
node dist/main.js <nombre-comando>
```
