import { Router } from 'express';
import { saveForm, loadForm, listForms, deleteForm } from '../lib/data/services/formService';

const router = Router();

router.post('/save/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const spec = req.body;
    await saveForm(id, spec);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.get('/load/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const obj = await loadForm(id);
    res.json({ ok: true, data: obj });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.get('/list', async (_req, res) => {
  try {
    const forms = await listForms();
    res.json({ ok: true, data: forms });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteForm(id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
