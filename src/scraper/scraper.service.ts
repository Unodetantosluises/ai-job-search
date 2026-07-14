import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright-extra';
import stealthPlugin = require('puppeteer-extra-plugin-stealth');
import { Vacancy } from '../database/entities/vacancy.entity';

// Registrar el plugin de evasión Stealth
chromium.use(stealthPlugin());

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  /**
   * Levanta un navegador Chromium con User-Agent realista y evasión de automatización.
   */
  private async launchBrowser() {
    this.logger.log('Levantando navegador Chromium en modo headless con Stealth...');
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();
    return { browser, page };
  }

  /**
   * Extrae de forma segura el texto de un selector de la página si existe.
   */
  private async getTextContent(page: any, selector: string): Promise<string> {
    try {
      const element = await page.$(selector);
      if (element) {
        const text = await element.innerText();
        return text || '';
      }
    } catch (err) {
      this.logger.debug(`Error al obtener texto de selector '${selector}': ${err.message}`);
    }
    return '';
  }

  /**
   * Extrae la información de una vacante a partir de su URL.
   */
  async extractVacancyData(url: string): Promise<Partial<Vacancy>> {
    const hostname = new URL(url).hostname.toLowerCase();
    const { browser, page } = await this.launchBrowser();

    try {
      this.logger.log(`Navegando a: ${url}`);
      // Esperar 45 segundos máximo para páginas pesadas
      await page.goto(url, { waitUntil: 'load', timeout: 45000 });

      let title = '';
      let company = '';
      let description = '';
      let locationType = 'No especificado';

      if (hostname.includes('linkedin.com')) {
        this.logger.log('Procesando portal LinkedIn...');
        await page.waitForSelector('.top-card-layout__title, .job-details-jobs-unified-top-card__job-title, h1', { timeout: 15000 }).catch(() => {});
        
        title = await this.getTextContent(page, '.top-card-layout__title, .job-details-jobs-unified-top-card__job-title, h1');
        company = await this.getTextContent(page, '.topcard__org-name-link, .job-details-jobs-unified-top-card__company-name, a.topcard__org-name-link');
        description = await this.getTextContent(page, '.show-more-less-html__markup, .jobs-description__content, .description__text');
        
      } else if (hostname.includes('occ.com.mx')) {
        this.logger.log('Procesando portal OCC Mundial...');
        await page.waitForSelector('h1, div[class*="jobHeader"] h1', { timeout: 15000 }).catch(() => {});
        
        title = await this.getTextContent(page, 'h1[class*="jobName"], h1, div[class*="jobHeader"] h1');
        company = await this.getTextContent(page, 'a[class*="company"], a[href*="/perfil-empresa/"], div[class*="companyName"], h2');
        description = await this.getTextContent(page, 'div[class*="jobDescription"], div[id*="jobDescription"], div[class*="description"]');
        
      } else if (hostname.includes('simplyhired.mx') || hostname.includes('simplyhired.com')) {
        this.logger.log('Procesando portal Simply Hired...');
        await page.waitForSelector('h1[data-testid="viewJobTitle"], h1', { timeout: 15000 }).catch(() => {});
        
        title = await this.getTextContent(page, 'h1[data-testid="viewJobTitle"], h1');
        company = await this.getTextContent(page, 'span[data-testid="viewJobCompanyName"], div[class*="JobInfoHeader"] span');
        description = await this.getTextContent(page, 'div[data-testid="viewJobBodyJobFullDescriptionContent"], div[class*="JobDetail-section"], .jobdescription');
        
      } else if (hostname.includes('computrabajo.com')) {
        this.logger.log('Procesando portal CompuTrabajo...');
        const hasHash = !!new URL(url).hash;
        
        if (hasHash) {
          this.logger.log('Detectada URL de CompuTrabajo con Hash. Esperando panel lateral .box_detail...');
          await page.waitForSelector('.box_detail, #box_detail, div[class*="box_detail"]', { timeout: 20000 }).catch(() => {});
        } else {
          await page.waitForSelector('h1, .box_detail, #box_detail', { timeout: 15000 }).catch(() => {});
        }

        // Validar si existe el panel lateral (box_detail)
        const hasPanel = await page.$('.box_detail, #box_detail, div[class*="box_detail"]').then(el => !!el);

        if (hasPanel) {
          this.logger.log('Extrayendo datos de la vacante desde el panel lateral de CompuTrabajo...');
          title = await this.getTextContent(page, '.box_detail h1, .box_detail h2, #box_detail h1');
          company = await this.getTextContent(page, '.box_detail a[href*="trabajo-de-"], .box_detail [class*="company"], .box_detail p[class*="link"]');
          description = await this.getTextContent(page, '.box_detail [class*="description"], .box_detail div[class*="clear"], .box_detail p[class*="obs"]');
        } else {
          this.logger.log('Extrayendo datos de la vacante desde la página directa de CompuTrabajo...');
          title = await this.getTextContent(page, 'h1, [class*="title"]');
          company = await this.getTextContent(page, 'a[href*="trabajo-de-"], [class*="company"]');
          description = await this.getTextContent(page, '[class*="description"], div[class*="clear"]');
        }
      } else {
        throw new Error(`El dominio de portal '${hostname}' no está soportado en este momento.`);
      }

      title = title.trim();
      company = company.trim();
      description = description.trim();

      if (!title || !description) {
        throw new Error('No se pudo extraer la información mandatoria de la vacante (Título o Descripción vacíos). Verifique la estructura de la página.');
      }

      // Analizar modalidad en base a palabras clave
      const textToAnalyze = `${title} ${description}`.toLowerCase();
      if (
        textToAnalyze.includes('remoto') || 
        textToAnalyze.includes('remote') || 
        textToAnalyze.includes('home office') || 
        textToAnalyze.includes('homeoffice')
      ) {
        locationType = 'Remoto';
      } else if (
        textToAnalyze.includes('híbrido') || 
        textToAnalyze.includes('hibrido') || 
        textToAnalyze.includes('hybrid')
      ) {
        locationType = 'Híbrido';
      } else if (
        textToAnalyze.includes('presencial') || 
        textToAnalyze.includes('on-site') || 
        textToAnalyze.includes('onsite') || 
        textToAnalyze.includes('oficina')
      ) {
        locationType = 'Presencial';
      }

      return {
        company,
        role: title,
        description,
        location_type: locationType,
        url,
      };
    } catch (error) {
      this.logger.error(`Error durante el scraping de la vacante: ${error.message}`);
      throw error;
    } finally {
      this.logger.log('Cerrando el navegador...');
      await browser.close().catch(() => {});
    }
  }
}
