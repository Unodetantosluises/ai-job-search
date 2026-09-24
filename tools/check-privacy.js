#!/usr/bin/env node
/**
 * Guardián de CI: Verificación de Privacidad y Prevención de Fugas de PII.
 * 
 * Verifica que:
 * 1. Los archivos con datos reales no estén siendo rastreados por Git (git ls-files).
 * 2. Las reglas esenciales de .gitignore sigan presentes y no hayan sido eliminadas.
 * 3. Ningún archivo rastreado contenga números de teléfono o correos personales sin anonimizar.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const FORBIDDEN_TRACKED_PATTERNS = [
  'docs_prompts/skills/job-application-assistant/01-candidate-profile.md',
  'docs_prompts/skills/job-application-assistant/02-behavioral-profile.md',
  '.env',
  'job_search.sqlite',
  'job_search.sqlite-journal',
  'salary_data.json',
  'job_search_tracker.csv',
  'local_storage/',
];

const REQUIRED_GITIGNORE_RULES = [
  'docs_prompts/skills/job-application-assistant/01-candidate-profile.md',
  'docs_prompts/skills/job-application-assistant/02-behavioral-profile.md',
  '.env',
  'job_search.sqlite',
  'local_storage/',
  'documents/cv/**',
  'cv/main_*.tex',
  '!cv/main_example.tex',
];

function main() {
  console.log('====================================================');
  console.log('🛡️ [CI Guard: Privacy & PII Verification]');
  console.log('====================================================');

  let errors = 0;

  // 1. Obtener lista de archivos rastreados por Git
  let trackedFiles = [];
  try {
    const output = execSync('git ls-files', { cwd: ROOT_DIR, encoding: 'utf-8' });
    trackedFiles = output.split('\n').map(f => f.trim()).filter(Boolean);
  } catch (err) {
    console.warn('⚠️ No se pudo ejecutar git ls-files. ¿Es un repositorio Git? Saltando verificación de árbol git.');
  }

  // Comprobar que ningún archivo prohibido esté en el índice de Git
  for (const forbidden of FORBIDDEN_TRACKED_PATTERNS) {
    const matches = trackedFiles.filter(file => {
      // Permitir explícitamente plantillas/ejemplos públicos documentados
      if (file.endsWith('.example') || file.includes('.example.') || file.endsWith('.sample')) {
        return false;
      }
      if (forbidden.endsWith('/')) {
        return file.startsWith(forbidden);
      }
      return file === forbidden || file.startsWith(forbidden + '.') || file.startsWith(forbidden + '/');
    });
    if (matches.length > 0) {
      console.error(`❌ ERROR DE PRIVACIDAD: El archivo prohibido está rastreado por Git: ${matches.join(', ')}`);
      errors++;
    }
  }


  // 2. Verificar que .gitignore contiene las reglas críticas
  const gitignorePath = path.join(ROOT_DIR, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    for (const rule of REQUIRED_GITIGNORE_RULES) {
      if (!gitignoreContent.includes(rule)) {
        console.error(`❌ ERROR DE INTEGRIDAD: Falta la regla obligatoria en .gitignore: "${rule}"`);
        errors++;
      }
    }
  } else {
    console.error('❌ ERROR CRÍTICO: No se encontró el archivo .gitignore.');
    errors++;
  }

  // 3. Escanear archivos rastreados en busca de patrones sensibles accidentales
  const sensitiveRegexes = [
    { pattern: /\+52\s*55\d{8}/g, name: 'Número telefónico personal' },
    { pattern: /luisantoniodiaz97@gmail\.com/g, name: 'Correo personal del autor' },
  ];

  for (const file of trackedFiles) {
    // Solo escanear archivos de texto rastreados
    if (file.endsWith('.md') || file.endsWith('.ts') || file.endsWith('.json') || file.endsWith('.tex')) {
      const fullPath = path.join(ROOT_DIR, file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const { pattern, name } of sensitiveRegexes) {
          if (pattern.test(content)) {
            console.error(`❌ FILTRACIÓN DETECTADA: Se encontró "${name}" en el archivo rastreado: ${file}`);
            errors++;
          }
        }
      }
    }
  }

  if (errors > 0) {
    console.error(`\n🚨 Falló la verificación de privacidad con ${errors} error(es). Corrige las filtraciones antes de hacer push/merge.`);
    process.exit(1);
  }

  console.log('✅ ÉXITO: Todos los archivos rastreados cumplen con los estándares de privacidad y anonimización.');
  process.exit(0);
}

main();
