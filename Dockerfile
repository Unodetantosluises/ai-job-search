# Usa la imagen oficial de Node.js v22 basada en Debian Bookworm (Debian 12, versión estable actual)
FROM node:22-bookworm-slim

# Evitar prompts interactivos de debconf (evita exit code 100 en configuración de paquetes)
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema:
# - TeX Live para compilación dual: luatex (CV moderncv) y xetex (Carta de presentación)
# - lmodern y texlive-fonts-recommended (fuentes ATS-safe ligeras; omite texlive-fonts-extra de 2GB)
# - poppler-utils para inspección y extracción de texto de PDFs
# - herramientas base de compilación para dependencias nativas (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-xetex \
    texlive-luatex \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    lmodern \
    fontconfig \
    poppler-utils \
    python3 \
    make \
    g++ \
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
