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
import { saveForm, loadForm, listForms, deleteForm, formExists } from '../lib/data/services/formService.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();

router.post('/save/', async (req, res, next) => {
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
      throw new ValidationError('Invalid form name');
    }

    await saveForm(id, spec);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/load/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const obj = await loadForm(id);
    res.json({ ok: true, data: obj });
  } catch (e) {
    next(e);
  }
});

router.get('/exists/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const exists = await formExists(id);
    res.json({ ok: true, data: exists });
  } catch (e) {
    next(e);
  }
});

router.get('/list', async (req, res, next) => {
  try {
    // Admin can request all forms including unpublished ones via ?includeUnpublished=true
    const includeUnpublished = req.query.includeUnpublished === 'true';
    const forms = await listForms(includeUnpublished);
    res.json({ ok: true, data: forms });
  } catch (e) {
    next(e);
  }
});

router.delete('/delete/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const awaitDeleteForm = deleteForm(id);
    await awaitDeleteForm;
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
