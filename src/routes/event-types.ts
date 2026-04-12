import { Router, type Request, type Response, type NextFunction } from 'express';
import { calcomService } from '../services/calcom.js';
import { Sentry } from '../instrument.js';

const router = Router();

/**
 * GET /api/event-types
 *
 * List all Cal.com event types configured for this account.
 */
router.get(
  '/api/event-types',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const eventTypes = await Sentry.startSpan(
        { op: 'calcom.event-types', name: 'list-event-types' },
        async () => calcomService.getEventTypes(),
      );

      res.json({ eventTypes });
    } catch (error) {
      console.error('Error fetching event types:', error);
      Sentry.captureException(error, { tags: { endpoint: 'event-types' } });
      next(error);
    }
  },
);

/**
 * GET /api/event-types/:id
 *
 * Get a specific event type by ID.
 */
router.get(
  '/api/event-types/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params['id']);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid event type ID' });
        return;
      }

      const eventType = await Sentry.startSpan(
        { op: 'calcom.event-types', name: 'get-event-type' },
        async () => calcomService.getEventTypeById(id),
      );

      res.json({ eventType });
    } catch (error) {
      console.error('Error fetching event type:', error);
      Sentry.captureException(error, { tags: { endpoint: 'event-type-detail' } });
      next(error);
    }
  },
);

/**
 * GET /api/sessions
 *
 * List the 3 AstroLumina session types with their current Cal.com event type status.
 * This is the primary endpoint the frontend uses to display available sessions.
 */
router.get(
  '/api/sessions',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const eventTypes = await Sentry.startSpan(
        { op: 'calcom.event-types', name: 'list-sessions' },
        async () => calcomService.getEventTypes(),
      );

      const sessionTypes = [
        {
          key: 'astrograma-natala-si-karmica',
          title: 'Astrograma Natală și Karmică',
          slug: 'astrograma-natala-si-karmica',
          description:
            'Sesiune live în care aducem claritate și direcție prin înțelegerea astrogramei tale! Explorăm împreună harta ta natală – „poza cerului" din momentul nașterii tale. Fiecare planetă vorbește despre o parte din tine, de la felul în care iubești, până la cum îți exprimi talentele sau ce tipare te pot bloca. Include și analiza transgenerațională a hărții tale.',
          durationMinutes: 120,
          price: 75,
          currency: 'EUR',
          location: { type: 'integration', integration: 'cal-video' },
          questions: {
            phone: 'Număr telefon',
            birthDate: 'Data nașterii (zi/lună/an)',
            birthPlace: 'Locul nașterii (oraș, județ, țară)',
            birthTime: 'Ora nașterii (format 24h sau AM/PM specificat)',
          },
        },
        {
          key: 'astrograma-relationala',
          title: 'Astrograma Relațională',
          slug: 'astrograma-relationala',
          description:
            'Descoperă dinamicile relației voastre! În această sesiune live, explorăm dinamicile profunde ale relației tale cu partenerul, părinții, copiii, prietenii sau orice altă persoană de interes. Poți solicita o Astrogramă Relațională pentru orice tip de relație - romantică, familială, profesională sau de prietenie.',
          durationMinutes: 90,
          price: 75,
          currency: 'EUR',
          location: { type: 'integration', integration: 'cal-video' },
          questions: {
            phone: 'Număr telefon',
            birthDate: 'Datele tale de naștere (data nașterii, ora și orașul / județul / țara)',
            birthPlace: 'Datele partener (data nașterii, ora și orașul / județul / țara)',
            birthTime: '',
          },
        },
        {
          key: 'astrograma-previzionala',
          title: 'Astrograma Previzională',
          slug: 'astrograma-previzionala',
          description:
            'Sesiune live în care studiem predispozițiile tale pe următorul an. Această sesiune live îți oferă o privire detaliată asupra predispozițiilor și evenimentelor semnificative din următoarele 12 luni, așa cum se reflectă în harta ta natală.',
          durationMinutes: 90,
          price: 75,
          currency: 'EUR',
          location: { type: 'integration', integration: 'cal-video' },
          questions: {
            phone: 'Număr telefon',
            birthDate: 'Data nașterii (zi/lună/an)',
            birthPlace: 'Locul nașterii (oraș, județ, țară)',
            birthTime: 'Ora nașterii (format 24h sau AM/PM specificat)',
          },
        },
      ];

      const enriched = sessionTypes.map((session) => {
        const calcomType = eventTypes.find(
          (et: { slug: string }) => et.slug === session.slug,
        );
        return {
          ...session,
          eventTypeId: calcomType?.id ?? null,
          isConfigured: !!calcomType,
        };
      });

      res.json({ sessions: enriched });
    } catch (error) {
      console.error('Error listing sessions:', error);
      Sentry.captureException(error, { tags: { endpoint: 'sessions' } });
      next(error);
    }
  },
);

export default router;
