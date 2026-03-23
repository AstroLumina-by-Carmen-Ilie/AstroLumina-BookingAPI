import axios, { type AxiosInstance } from 'axios';
import { env } from '../config/env.js';
import type {
  CalComEventType,
  CalComBooking,
  CalComSlotsResponse,
  CreateBookingPayload,
  RescheduleBookingPayload,
} from '../types/calcom.js';

class CalComService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.CALCOM_BASE_URL,
      params: {
        apiKey: env.CALCOM_API_KEY,
      },
      headers: {
        'Content-Type': 'application/json',
        'cal-api-version': env.CALCOM_API_VERSION,
      },
    });
  }

  // ─── Event Types ──────────────────────────────────────────

  async getEventTypes(): Promise<CalComEventType[]> {
    const { data } = await this.client.get('/event-types');
    return data.event_types ?? data.data ?? [];
  }

  async getEventTypeById(id: number): Promise<CalComEventType> {
    const { data } = await this.client.get(`/event-types/${id}`);
    return data.event_type ?? data;
  }

  async createEventType(payload: Record<string, unknown>): Promise<CalComEventType> {
    const { data } = await this.client.post('/event-types', payload);
    return data.event_type ?? data;
  }

  async updateEventType(id: number, payload: Record<string, unknown>): Promise<CalComEventType> {
    const { data } = await this.client.patch(`/event-types/${id}`, payload);
    return data.event_type ?? data;
  }

  async deleteEventType(id: number): Promise<void> {
    await this.client.delete(`/event-types/${id}`);
  }

  // ─── Bookings ────────────────────────────────────────────

  async getBookings(params?: Record<string, string>): Promise<CalComBooking[]> {
    const { data } = await this.client.get('/bookings', { params });
    return data.bookings ?? data.data ?? [];
  }

  async getBooking(uid: string): Promise<CalComBooking | CalComBooking[]> {
    const { data } = await this.client.get(`/bookings/${uid}`);
    return data.booking ?? data;
  }

  async createBooking(payload: CreateBookingPayload): Promise<CalComBooking> {
    const { data } = await this.client.post('/bookings', payload);
    return data.booking ?? data;
  }

  async rescheduleBooking(uid: string, payload: RescheduleBookingPayload): Promise<CalComBooking> {
    const { data } = await this.client.patch(`/bookings/${uid}/reschedule`, payload);
    return data.booking ?? data;
  }

  async cancelBooking(uid: string, reason?: string): Promise<void> {
    await this.client.delete(`/bookings/${uid}`, {
      data: { cancellationReason: reason },
    });
  }

  // ─── Availability / Slots ────────────────────────────────

  async getAvailableSlots(
    eventTypeId: number,
    startTime: string,
    endTime: string,
    timeZone?: string,
  ): Promise<CalComSlotsResponse> {
    const { data } = await this.client.get('/slots', {
      params: {
        eventTypeId,
        startTime,
        endTime,
        timeZone: timeZone ?? 'Europe/Bucharest',
      },
    });
    return data;
  }
}

export const calcomService = new CalComService();
