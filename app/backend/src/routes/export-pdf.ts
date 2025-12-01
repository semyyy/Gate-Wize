import { Router } from 'express';
import { generatePdf, type ExportPdfRequest } from '../lib/pdf/pdfService';

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
