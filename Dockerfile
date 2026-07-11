# Usa la imagen oficial de Node.js v22 basada en Debian slim
FROM node:22-bullseye-slim

# Instalar dependencias del sistema (TeX Live completo/esencial, poppler-utils para manejo de PDFs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-xetex \
    texlive-luatex \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    poppler-utils \
    python3 \
    python3-pip \
    make \
    git \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar configuración de dependencias
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci

# Copiar el resto del código y directorios
COPY src/ ./src/
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY cv/ ./cv/
COPY cover_letters/ ./cover_letters/
COPY docs_prompts/ ./docs_prompts/
COPY tools/ ./tools/
COPY salary_lookup.py ./

# Compilar la aplicación NestJS
RUN npm run build

# Definir el comando por defecto para ejecutar la CLI
CMD ["node", "dist/main.js"]
