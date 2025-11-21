import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import formRouter from './routes/form';
import rateSimpleFieldRouter from './routes/rate-simple-field';
import rateDetailedRowRouter from './routes/rate-detailed-row';


const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/form', formRouter);
app.use('/api/llm', rateSimpleFieldRouter);
app.use('/api/llm', rateDetailedRowRouter);

app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});
