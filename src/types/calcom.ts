export interface CalComEventType {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  lengthInMinutes: number;
  locations: CalComLocation[];
  bookingFields: CalComBookingField[];
  disableGuests: boolean;
  slotInterval: number | null;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  scheduleId: number | null;
  price: number;
  currency: string;
  bookingLimitsCount: Record<string, number> | null;
  confirmationPolicy: CalComConfirmationPolicy | null;
  recurringEvent: CalComRecurringEvent | null;
  seatsPerTimeSlot: number | null;
}

export interface CalComLocation {
  type: string;
  link?: string;
  address?: string;
  phone?: string;
  integration?: string;
}

export interface CalComBookingField {
  type: string;
  slug: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

export interface CalComConfirmationPolicy {
  type: string;
  blockUnconfirmedBookingsInBooker: boolean;
  noticeThreshold?: { unit: string; count: number };
}

export interface CalComRecurringEvent {
  freq: number;
  interval: number;
  count: number;
}

export interface CalComBooking {
  id: number;
  uid: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: string;
  responses: Record<string, unknown>;
  attendees: CalComAttendee[];
  location: string | null;
  eventTypeId: number;
  eventType: { id: number; title: string; slug: string } | null;
  metadata: Record<string, unknown>;
}

export interface CalComAttendee {
  name: string;
  email: string;
  timeZone: string;
  phoneNumber?: string;
  language?: string;
}

export interface CalComSlot {
  start: string;
  end: string;
}

export interface CalComSlotsResponse {
  slots: Record<string, CalComSlot[]>;
}

export interface CreateBookingPayload {
  eventTypeId: number;
  start: string;
  attendee: {
    name: string;
    email: string;
    timeZone: string;
    phoneNumber?: string;
    language?: string;
  };
  location?: {
    type: string;
    integration?: string;
    link?: string;
    address?: string;
    phone?: string;
  };
  metadata?: Record<string, string>;
  bookingFieldsResponses?: Record<string, unknown>;
  guests?: string[];
}

export interface RescheduleBookingPayload {
  start: string;
  rescheduledBy?: string;
  reschedulingReason?: string;
}

export interface AstroSessionType {
  key: string;
  eventTypeId: number | null;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  price: number;
  currency: string;
  location: CalComLocation;
  questions: {
    phone: string;
    birthDate: string;
    birthPlace: string;
    birthTime: string;
  };
}
