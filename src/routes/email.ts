import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Resend } from 'resend';
import { env } from '../config/env.js';
import { Sentry } from '../instrument.js';
import { createError } from '../middleware/error-handler.js';

const router = Router();

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const FROM_EMAIL = 'AstroLumina <carmen.ilie@astrolumina.ro>';

const emailSchema = z.object({
  to: z.string().email('Invalid email address'),
  type: z.enum(['ghid-saturn', 'soarele-stralucirea-ta']),
});

const templates = {
  'ghid-saturn': {
    subject: 'Ghidul lui Saturn în Berbec | Download',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a1a; color: #f3e8ff;">
        <h1 style="color: #a855f7;">Bine ai venit!</h1>
        <p>Eu sunt <strong>Ghidul lui Saturn în Berbec</strong> - ghidul tău personal pentru această perioadă intensă.</p>
        <p>Vei primi curând PDF-ul cu toate informațiile despre cum să navighezi energiile lui Saturn în semnul Berbecului.</p>
        <p style="margin-top: 30px;">Cu drag,<br>Echipa AstroLumina</p>
      </div>
    `,
  },
  'soarele-stralucirea-ta': {
    subject: 'Soarele, Strălucirea Ta | Cadoul tău',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a1a; color: #f3e8ff;">
        <h1 style="color: #fbbf24;">Soarele, Strălucirea Ta</h1>
        <p>Felicitări! Ai primit cadoul gratuit de la AstroLumina.</p>
        <p>Acest mesaj conține informațiile despre tine - zodia Soarelui tău.</p>
        <p>În curând vei primi și PDF-ul cu detalii complete.</p>
        <p style="margin-top: 30px;">Cu drag,<br>Echipa AstroLumina</p>
      </div>
    `,
  },
};

router.post('/send-email', async (req: Request, res: Response, next: NextFunction) => {
  const SentryInstance = Sentry;

  try {
    const parseResult = emailSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError(400, 'Invalid request body');
    }

    const { to, type } = parseResult.data;

    if (!resend) {
      throw createError(500, 'Email service not configured');
    }

    SentryInstance.setContext('email', { to, type });

    const template = templates[type];

    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      html: template.html,
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Email send error:', error);
    SentryInstance.captureException(error, { tags: { endpoint: 'send-email' } });
    next(error);
  }
});

export default router;