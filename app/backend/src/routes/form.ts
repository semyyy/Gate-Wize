import { Router } from 'express';
import { saveForm, loadForm, listForms, deleteForm, formExists } from '../lib/data/services/formService';

const router = Router();

router.post('/save/', async (req, res) => {
  try {
    // accept { spec, name } or raw spec
    const body = req.body;
    let spec: any = body;
    if (body && typeof body === 'object' && 'spec' in body) {
      spec = body.spec;
    }
    console.log('Saving form:', spec.name, spec);
    //noramalie spec name to id "-" seperated lowercase
    const id = spec.name
    .toLowerCase()          // lowercase
    .trim()                 // remove extra spaces at ends
    .replace(/\s+/g, '-')   // replace spaces with '-'
    .replace(/[^\w\-]/g, ''); // remove non-word characters except '-'
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid form name');
    }

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

router.get('/exists/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const exists = await formExists(id);
    res.json({ ok: true, data: exists });
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
