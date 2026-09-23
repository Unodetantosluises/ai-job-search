#!/usr/bin/env node
/**
 * Guardián de CI: Verificación de salud y vigencia del modelo Google Gemini.
 * 
 * Modos de ejecución:
 * 1. Con GEMINI_API_KEY (en repositorio principal con secreto configurado):
 *    Ejecuta un ping real a Google Gemini para verificar que el modelo exista,
 *    no esté deprecado y acepte peticiones.
 * 2. Sin GEMINI_API_KEY (en forks comunitarios o PRs externos):
 *    Realiza una validación estática de compatibilidad y nomenclatura para no
 *    romper el pipeline de contribuidores externos.
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const apiKey = process.env.GEMINI_API_KEY;

  console.log('====================================================');
  console.log('🔍 [CI Guard: Gemini Validation]');
  console.log(`📌 Modelo configurado: ${modelName}`);
  console.log('====================================================');

  // 1. Validación de nomenclatura y sintaxis básica
  if (!modelName || typeof modelName !== 'string' || !modelName.startsWith('gemini-')) {
    console.error(`❌ ERROR: El identificador del modelo "${modelName}" no tiene un formato válido (debe iniciar con "gemini-").`);
    process.exitCode = 1;
    return;
  }

  // 2. Validación en vivo o degradación elegante
  if (!apiKey || apiKey === 'tu_gemini_api_key_aqui') {
    console.log('⚠️ AVISO: GEMINI_API_KEY no encontrada en las variables de entorno.');
    console.log('ℹ️ Se ha superado la validación estática de nomenclatura.');
    console.log('ℹ️ Para activar la prueba en vivo en GitHub Actions, agrega el secreto GEMINI_API_KEY en los Settings del repositorio.');
    return;
  }

  console.log('📡 Clave de API detectada. Conectando con Google Gemini API para validar vigencia del modelo...');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Ping mínimo (1 token)
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Responde con "PONG".' }] }],
    });
    const response = await result.response;
    const text = response.text().trim();

    console.log(`✅ ÉXITO: El modelo "${modelName}" está activo y respondió a la API de Google: "${text}"`);
    return;
  } catch (error) {
    console.error(`❌ ERROR CRÍTICO: Falló la validación del modelo "${modelName}" contra la API de Google.`);
    console.error(`Detalles del error: ${error.message}`);
    if (error.status === 404 || error.message.includes('not found') || error.message.includes('deprecated')) {
      console.error(`🚨 ALERTA: El modelo "${modelName}" parece haber sido retirado o deprecado por Google. Actualiza GEMINI_MODEL en .env.`);
    }
    process.exitCode = 1;
  }
}

main();

