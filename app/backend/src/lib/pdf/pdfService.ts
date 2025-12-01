import puppeteer from 'puppeteer';

export interface ExportPdfRequest {
  spec: FormSpec;
  value: Record<string, unknown>;
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
  const answer = value[path] as string | undefined;
  return `
    <div class="question">
      <h3>${escapeHtml(q.question)}</h3>
      ${q.description ? `<p class="description">${escapeHtml(q.description)}</p>` : ''}
      <div class="answer">${answer ? escapeHtml(answer) : '<em>No answer provided</em>'}</div>
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      background: white;
      padding: 40px;
    }

    .header {
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4f46e5;
    }

    .header h1 {
      font-size: 28pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .header .description {
      font-size: 12pt;
      color: #64748b;
      font-weight: 300;
    }

    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }

    .section h2 {
      font-size: 18pt;
      font-weight: 600;
      color: #4f46e5;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }

    .section-description {
      font-size: 10pt;
      color: #64748b;
      margin-bottom: 20px;
      font-style: italic;
    }

    .question {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .question h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #334155;
      margin-bottom: 8px;
    }

    .question .description {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 8px;
      font-style: italic;
    }

    .answer {
      background: #f8fafc;
      border-left: 3px solid #cbd5e1;
      padding: 12px 16px;
      font-size: 10pt;
      color: #334155;
      border-radius: 4px;
    }

    .answer em {
      color: #94a3b8;
    }

    .justification {
      margin-top: 8px;
      padding: 10px 14px;
      background: #fef3c7;
      border-left: 3px solid #fbbf24;
      font-size: 9pt;
      border-radius: 4px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 9pt;
    }

    .data-table th {
      background: #4f46e5;
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #4338ca;
    }

    .data-table td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      background: white;
    }

    .data-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    .image-container {
      margin-top: 12px;
      text-align: center;
    }

    .image-container img {
      max-width: 100%;
      max-height: 400px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
