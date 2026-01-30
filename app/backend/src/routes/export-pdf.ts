/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to use,
 * copy, modify, merge, publish, distribute, and sublicense the Software,
 * subject to the conditions of the MIT License and the Commons Clause.
 *
 * Commercial use of this Software is strictly prohibited unless explicit prior
 * written permission is obtained from EAExpertise.
 *
 * The Software may be used for internal business purposes, research,
 * evaluation, or other non-commercial purposes.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Router } from 'express';
import { generatePdf, type ExportPdfRequest } from '../lib/pdf/pdfService.js';

const router = Router();

router.post('/export-pdf', async (req, res) => {
    try {
        const { spec, value } = req.body as ExportPdfRequest;

        if (!spec || !spec.name) {
            return res.status(400).json({ ok: false, error: 'Invalid form specification' });
        }

        if (!value || typeof value !== 'object') {
            return res.status(400).json({ ok: false, error: 'Invalid form values' });
        }

        console.log('Generating PDF for form:', spec.name);

        const pdfBuffer = await generatePdf({ spec, value });

        // Set headers for PDF download
        const filename = `${spec.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);
    } catch (e) {
        console.error('PDF generation error:', e);
        res.status(500).json({ ok: false, error: 'Failed to generate PDF: ' + String(e) });
    }
});

export default router;
