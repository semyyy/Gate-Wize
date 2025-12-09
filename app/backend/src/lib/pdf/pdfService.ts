import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

export interface ExportPdfRequest {
  spec: FormSpec;
  value: Record<string, unknown>;
}

// PDF Design Configuration Types
interface PdfDesignConfig {
  colors: {
    primary: string;
    accent: string;
    text: {
      heading: string;
      subheading: string;
      body: string;
      muted: string;
      light: string;
    };
    background: {
      page: string;
      answer: string;
      justification: string;
      tableRowEven: string;
      tableRowOdd: string;
    };
    border: {
      primary: string;
      secondary: string;
      answer: string;
      justification: string;
      table: string;
    };
    table: {
      headerBackground: string;
      headerText: string;
      headerBorder: string;
    };
  };
  typography: {
    fontFamily: string;
    fontSize: {
      h1: string;
      h2: string;
      h3: string;
      body: string;
      description: string;
      small: string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      normal: number;
      tight: number;
      relaxed: number;
    };
  };
  spacing: {
    padding: {
      page: string;
      answer: string;
      justification: string;
      tableCell: string;
      tableHeader: string;
    };
    margin: {
      headerBottom: string;
      sectionBottom: string;
      questionBottom: string;
      elementSmall: string;
      elementMedium: string;
      elementLarge: string;
    };
    borderWidth: {
      thin: string;
      medium: string;
      thick: string;
    };
  };
  layout: {
    borderRadius: {
      small: string;
      medium: string;
    };
    shadow: {
      small: string;
    };
    pdf: {
      format: string;
      margin: {
        top: string;
        right: string;
        bottom: string;
        left: string;
      };
    };
  };
}

// Type definitions for form structure
type FormSpec = {
  name: string;
  description?: string;
  sections: Section[];
};

type Section = {
  title: string;
  description?: string;
  questions: Question[];
};

type Question = SimpleQuestion | OptionQuestion | DetailedQuestion | ImageQuestion;

type SimpleQuestion = {
  type: 'simple';
  question: string;
  description?: string;
  examples?: string[];
  multiple?: boolean;
};

type OptionQuestion = {
  type: 'option';
  question: string;
  description?: string;
  options: string[];
  justification?: boolean;
  multiple?: boolean;
};

type DetailedQuestion = {
  type: 'detailed';
  question: string;
  description?: string;
  attributes: DetailedAttribute[];
};

type DetailedAttribute = {
  name: string;
  description?: string;
  options?: string[];
  examples?: string[];
};

type ImageQuestion = {
  type: 'image';
  question: string;
  description?: string;
  url?: string;
};

/**
 * Load PDF design configuration from YAML file
 */
function loadPdfDesignConfig(): PdfDesignConfig {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const baseDir = path.dirname(__filename); // .../pdf
    const configPath = path.join(baseDir, 'pdf-design.yaml');
    const altPath = path.join(process.cwd(), 'src', 'lib', 'pdf', 'pdf-design.yaml');
    const filePath = fs.existsSync(configPath) ? configPath : altPath;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(raw) as PdfDesignConfig;
  } catch (error) {
    console.error('Failed to load PDF design config, using defaults:', error);
    // Return default configuration as fallback
    throw new Error('PDF design configuration file not found');
  }
}

/**
 * Escape HTML special characters to prevent XSS and rendering issues
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generate HTML for a simple question
 */
function renderSimpleQuestion(q: Question & { type: 'simple' }, path: string, value: Record<string, unknown>): string {
  const answer = value[path];
  let answerHtml = '';

  // Handle multiple responses
  if (q.multiple && Array.isArray(answer)) {
    if (answer.length === 0) {
      answerHtml = '<em>No answers provided</em>';
    } else {
      const listItems = answer
        .filter(item => item && String(item).trim())
        .map(item => `<li>${escapeHtml(String(item))}</li>`)
        .join('');
      answerHtml = listItems ? `<ul class="response-list">${listItems}</ul>` : '<em>No answers provided</em>';
    }
  } else {
    // Handle single response
    const singleAnswer = typeof answer === 'string' ? answer : '';
    answerHtml = singleAnswer ? escapeHtml(singleAnswer) : '<em>No answer provided</em>';
  }

  return `
    <div class="question">
      <h3>${escapeHtml(q.question)}</h3>
      ${q.description ? `<p class="description">${escapeHtml(q.description)}</p>` : ''}
      <div class="answer">${answerHtml}</div>
    </div>
  `;
}

/**
 * Generate HTML for an option question
 */
function renderOptionQuestion(q: Question & { type: 'option' }, path: string, value: Record<string, unknown>): string {
  const answer = value[path];
  const isMultiple = q.multiple === true;
  let answerText = '';

  if (isMultiple && Array.isArray(answer)) {
    answerText = answer.length > 0 ? answer.map(escapeHtml).join(', ') : '<em>No selection</em>';
  } else if (typeof answer === 'string') {
    answerText = escapeHtml(answer);
  } else {
    answerText = '<em>No selection</em>';
  }

  const justification = value[`${path}.justification`] as string | undefined;

  return `
    <div class="question">
      <h3>${escapeHtml(q.question)}</h3>
      ${q.description ? `<p class="description">${escapeHtml(q.description)}</p>` : ''}
      <div class="answer">${answerText}</div>
      ${justification ? `<div class="justification"><strong>Justification:</strong> ${escapeHtml(justification)}</div>` : ''}
    </div>
  `;
}

/**
 * Generate HTML for a detailed question (table)
 */
function renderDetailedQuestion(q: Question & { type: 'detailed' }, path: string, value: Record<string, unknown>): string {
  const rows: Record<string, unknown>[] = Array.isArray(value[path]) ? (value[path] as Record<string, unknown>[]) : [];

  if (rows.length === 0) {
    return `
      <div class="question">
        <h3>${escapeHtml(q.question)}</h3>
        ${q.description ? `<p class="description">${escapeHtml(q.description)}</p>` : ''}
        <div class="answer"><em>No data provided</em></div>
      </div>
    `;
  }

  const tableRows = rows
    .map(
      (row, ri) => `
    <tr>
      ${q.attributes
          .map((attr) => {
            const cellValue = row[attr.name];
            const displayValue = cellValue != null ? escapeHtml(String(cellValue)) : '';
            return `<td>${displayValue}</td>`;
          })
          .join('')}
    </tr>
  `
    )
    .join('');

  return `
    <div class="question">
      <h3>${escapeHtml(q.question)}</h3>
      ${q.description ? `<p class="description">${escapeHtml(q.description)}</p>` : ''}
      <table class="data-table">
        <thead>
          <tr>
            ${q.attributes.map((attr) => `<th>${escapeHtml(attr.name)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate HTML for an image question
 */
function renderImageQuestion(q: Question & { type: 'image' }, path: string, value: Record<string, unknown>): string {
  const imageUrl = (value[path] as string) || q.url || '';

  return `
    <div class="question">
      <h3>${escapeHtml(q.question)}</h3>
      ${q.description ? `<p class="description">${escapeHtml(q.description)}</p>` : ''}
      ${imageUrl
      ? `<div class="image-container"><img src="${escapeHtml(imageUrl)}" alt="Uploaded image" /></div>`
      : '<div class="answer"><em>No image provided</em></div>'
    }
    </div>
  `;
}

/**
 * Render a question based on its type
 */
function renderQuestion(q: Question, path: string, value: Record<string, unknown>): string {
  switch (q.type) {
    case 'simple':
      return renderSimpleQuestion(q, path, value);
    case 'option':
      return renderOptionQuestion(q, path, value);
    case 'detailed':
      return renderDetailedQuestion(q, path, value);
    case 'image':
      return renderImageQuestion(q, path, value);
    default:
      return '';
  }
}

/**
 * Render a section with its questions
 */
function renderSection(section: Section, sectionIndex: number, value: Record<string, unknown>): string {
  const questionsHtml = section.questions
    .map((q, qi) => {
      const path = `s${sectionIndex}.q${qi}`;
      return renderQuestion(q, path, value);
    })
    .join('');

  return `
    <div class="section">
      <h2>${sectionIndex + 1}. ${escapeHtml(section.title)}</h2>
      ${section.description ? `<p class="section-description">${escapeHtml(section.description)}</p>` : ''}
      ${questionsHtml}
    </div>
  `;
}

/**
 * Generate complete HTML document for PDF
 */
function generateHtml(req: ExportPdfRequest): string {
  const { spec, value } = req;
  const config = loadPdfDesignConfig();

  const sectionsHtml = spec.sections.map((section, si) => renderSection(section, si, value)).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(spec.name)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${config.typography.fontFamily};
      font-size: ${config.typography.fontSize.body};
      line-height: ${config.typography.lineHeight.normal};
      color: ${config.colors.text.body};
      background: ${config.colors.background.page};
      padding: ${config.spacing.padding.page};
    }

    .header {
      margin-bottom: ${config.spacing.margin.headerBottom};
      padding-bottom: ${config.spacing.margin.elementLarge};
      border-bottom: ${config.spacing.borderWidth.thick} solid ${config.colors.border.primary};
    }

    .header h1 {
      font-size: ${config.typography.fontSize.h1};
      font-weight: ${config.typography.fontWeight.bold};
      color: ${config.colors.text.heading};
      margin-bottom: ${config.spacing.margin.elementSmall};
    }

    .header .description {
      font-size: ${config.typography.fontSize.description};
      color: ${config.colors.text.muted};
      font-weight: ${config.typography.fontWeight.light};
    }

    .section {
      margin-bottom: ${config.spacing.margin.sectionBottom};
      page-break-inside: avoid;
    }

    .section h2 {
      font-size: ${config.typography.fontSize.h2};
      font-weight: ${config.typography.fontWeight.semibold};
      color: ${config.colors.text.heading};
      margin-bottom: ${config.spacing.margin.elementMedium};
      padding-bottom: ${config.spacing.margin.elementSmall};
      border-bottom: ${config.spacing.borderWidth.medium} solid ${config.colors.border.secondary};
    }

    .section-description {
      font-size: ${config.typography.fontSize.description};
      color: ${config.colors.text.muted};
      margin-bottom: ${config.spacing.margin.elementLarge};
      font-style: italic;
    }

    .question {
      margin-bottom: ${config.spacing.margin.questionBottom};
      page-break-inside: avoid;
    }

    .question h3 {
      font-size: ${config.typography.fontSize.h3};
      font-weight: ${config.typography.fontWeight.semibold};
      color: ${config.colors.text.heading};
      margin-bottom: ${config.spacing.margin.elementSmall};
    }

    .question .description {
      font-size: ${config.typography.fontSize.small};
      color: ${config.colors.text.muted};
      margin-bottom: ${config.spacing.margin.elementSmall};
      font-style: italic;
    }

    .answer {
      background: ${config.colors.background.answer};
      border-left: ${config.spacing.borderWidth.thick} solid ${config.colors.border.answer};
      padding: ${config.spacing.padding.answer};
      font-size: ${config.typography.fontSize.description};
      color: ${config.colors.text.body};
      border-radius: ${config.layout.borderRadius.small};
    }

    .answer em {
      color: ${config.colors.text.light};
    }

    .response-list {
      margin: 0;
      padding-left: 20px;
      list-style-type: disc;
    }

    .response-list li {
      margin-bottom: ${config.spacing.margin.elementSmall};
      line-height: ${config.typography.lineHeight.relaxed};
    }

    .response-list li:last-child {
      margin-bottom: 0;
    }

    .justification {
      margin-top: ${config.spacing.margin.elementSmall};
      padding: ${config.spacing.padding.justification};
      background: ${config.colors.background.justification};
      border-left: ${config.spacing.borderWidth.thick} solid ${config.colors.border.justification};
      font-size: ${config.typography.fontSize.small};
      border-radius: ${config.layout.borderRadius.small};
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: ${config.spacing.margin.elementMedium};
      font-size: ${config.typography.fontSize.small};
    }

    .data-table th {
      background: ${config.colors.table.headerBackground};
      color: ${config.colors.table.headerText};
      padding: ${config.spacing.padding.tableHeader};
      text-align: left;
      font-weight: ${config.typography.fontWeight.semibold};
      border: ${config.spacing.borderWidth.thin} solid ${config.colors.table.headerBorder};
    }

    .data-table td {
      padding: ${config.spacing.padding.tableCell};
      border: ${config.spacing.borderWidth.thin} solid ${config.colors.border.table};
      background: ${config.colors.background.tableRowOdd};
    }

    .data-table tr:nth-child(even) td {
      background: ${config.colors.background.tableRowEven};
    }

    .image-container {
      margin-top: ${config.spacing.margin.elementMedium};
      text-align: center;
    }

    .image-container img {
      max-width: 100%;
      max-height: 400px;
      border: ${config.spacing.borderWidth.thin} solid ${config.colors.border.secondary};
      border-radius: ${config.layout.borderRadius.medium};
      box-shadow: ${config.layout.shadow.small};
    }

    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(spec.name)}</h1>
    ${spec.description ? `<div class="description">${escapeHtml(spec.description)}</div>` : ''}
  </div>

  ${sectionsHtml}
</body>
</html>
  `;
}

/**
 * Generate PDF from form data using Puppeteer
 */
export async function generatePdf(req: ExportPdfRequest): Promise<Buffer> {
  const html = generateHtml(req);
  const config = loadPdfDesignConfig();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf({
      format: config.layout.pdf.format as any,
      printBackground: true,
      margin: {
        top: config.layout.pdf.margin.top,
        right: config.layout.pdf.margin.right,
        bottom: config.layout.pdf.margin.bottom,
        left: config.layout.pdf.margin.left,
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
