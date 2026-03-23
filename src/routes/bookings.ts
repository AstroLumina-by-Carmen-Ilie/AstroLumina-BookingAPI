import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { calcomService } from '../services/calcom.js';
import { Sentry } from '../instrument.js';
import { createError } from '../middleware/error-handler.js';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const createBookingSchema = z.object({
  eventTypeId: z.number().int().positive('eventTypeId must be a positive integer'),
  start: z.string().min(1, 'Start time is required (ISO 8601 UTC)'),
  attendee: z.object({
    name: z.string().min(1, 'Attendee name is required'),
    email: z.string().email('Valid attendee email is required'),
    timeZone: z.string().min(1, 'Time zone is required'),
    phoneNumber: z.string().optional(),
    language: z.string().optional(),
  }),
  metadata: z.record(z.string()).optional(),
  bookingFieldsResponses: z.record(z.unknown()).optional(),
  guests: z.array(z.string().email()).optional(),
});

const rescheduleBookingSchema = z.object({
  start: z.string().min(1, 'New start time is required (ISO 8601 UTC)'),
  rescheduledBy: z.string().email().optional(),
  reschedulingReason: z.string().optional(),
});

const bookingUidSchema = z.object({
  uid: z.string().min(1, 'Booking UID is required'),
});

// ─── Routes ─────────────────────────────────────────────────

/**
 * GET /api/bookings
 *
 * List bookings. Supports filtering by status, attendee email, and date range.
 */
router.get(
  '/api/bookings',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params: Record<string, string> = {};

      if (req.query['status']) params['status'] = String(req.query['status']);
      if (req.query['attendeeEmail']) params['attendeeEmail'] = String(req.query['attendeeEmail']);
      if (req.query['afterStart']) params['afterStart'] = String(req.query['afterStart']);
      if (req.query['beforeEnd']) params['beforeEnd'] = String(req.query['beforeEnd']);
      if (req.query['take']) params['take'] = String(req.query['take']);
      if (req.query['skip']) params['skip'] = String(req.query['skip']);
      if (req.query['eventTypeId']) params['eventTypeId'] = String(req.query['eventTypeId']);

      const bookings = await Sentry.startSpan(
        { op: 'calcom.bookings', name: 'list-bookings' },
        async () => calcomService.getBookings(params),
      );

      res.json({ bookings });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Sentry.captureException(error, { tags: { endpoint: 'list-bookings' } });
      next(error);
    }
  },
);

/**
 * GET /api/bookings/:uid
 *
 * Get a specific booking by UID.
 */
router.get(
  '/api/bookings/:uid',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parseResult = bookingUidSchema.safeParse(req.params);
      if (!parseResult.success) {
        throw createError(400, 'Invalid booking UID');
      }

      const booking = await Sentry.startSpan(
        { op: 'calcom.bookings', name: 'get-booking' },
        async () => calcomService.getBooking(parseResult.data.uid),
      );

      res.json({ booking });
    } catch (error) {
      console.error('Error fetching booking:', error);
      Sentry.captureException(error, { tags: { endpoint: 'get-booking' } });
      next(error);
    }
  },
);

/**
 * POST /api/bookings
 *
 * Create a new booking.
 *
 * Body:
 * {
 *   "eventTypeId": 123,
 *   "start": "2026-04-01T10:00:00Z",
 *   "attendee": {
 *     "name": "Maria Popescu",
 *     "email": "maria@example.com",
 *     "timeZone": "Europe/Bucharest",
 *     "phoneNumber": "+40712345678"
 *   },
 *   "metadata": { "source": "stan-store" },
 *   "bookingFieldsResponses": {
 *     "phone": "+40712345678",
 *     "birth-date": "15.03.1990",
 *     "birth-place": "București, România",
 *     "birth-time": "14:30"
 *   }
 * }
 */
router.post(
  '/api/bookings',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parseResult = createBookingSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.issues.map((i) => i.message);
        throw createError(400, `Invalid booking data: ${errors.join(', ')}`);
      }

      const { eventTypeId, start, attendee, metadata, bookingFieldsResponses, guests } =
        parseResult.data;

      const booking = await Sentry.startSpan(
        { op: 'calcom.bookings', name: 'create-booking' },
        async () =>
          calcomService.createBooking({
            eventTypeId,
            start,
            attendee,
            metadata,
            bookingFieldsResponses,
            guests,
          }),
      );

      res.status(201).json({ booking });
    } catch (error) {
      console.error('Error creating booking:', error);
      Sentry.captureException(error, { tags: { endpoint: 'create-booking' } });
      next(error);
    }
  },
);

/**
 * PATCH /api/bookings/:uid/reschedule
 *
 * Reschedule an existing booking.
 *
 * Body:
 * {
 *   "start": "2026-04-02T14:00:00Z",
 *   "rescheduledBy": "maria@example.com",
 *   "reschedulingReason": "Conflict with work schedule"
 * }
 */
router.patch(
  '/api/bookings/:uid/reschedule',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uidResult = bookingUidSchema.safeParse(req.params);
      if (!uidResult.success) {
        throw createError(400, 'Invalid booking UID');
      }

      const bodyResult = rescheduleBookingSchema.safeParse(req.body);
      if (!bodyResult.success) {
        const errors = bodyResult.error.issues.map((i) => i.message);
        throw createError(400, `Invalid reschedule data: ${errors.join(', ')}`);
      }

      const booking = await Sentry.startSpan(
        { op: 'calcom.bookings', name: 'reschedule-booking' },
        async () =>
          calcomService.rescheduleBooking(uidResult.data.uid, bodyResult.data),
      );

      res.json({ booking });
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      Sentry.captureException(error, { tags: { endpoint: 'reschedule-booking' } });
      next(error);
    }
  },
);

/**
 * DELETE /api/bookings/:uid
 *
 * Cancel a booking. Optionally provide a cancellation reason.
 *
 * Body (optional):
 * {
 *   "reason": "Schedule conflict"
 * }
 */
router.delete(
  '/api/bookings/:uid',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uidResult = bookingUidSchema.safeParse(req.params);
      if (!uidResult.success) {
        throw createError(400, 'Invalid booking UID');
      }

      const reason = (req.body as { reason?: string } | undefined)?.reason;

      await Sentry.startSpan(
        { op: 'calcom.bookings', name: 'cancel-booking' },
        async () => calcomService.cancelBooking(uidResult.data.uid, reason),
      );

      res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Sentry.captureException(error, { tags: { endpoint: 'cancel-booking' } });
      next(error);
    }
  },
);

export default router;
