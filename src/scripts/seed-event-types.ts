/**
 * Seed script: Creates the 3 AstroLumina event types in Cal.com.
 *
 * Run with: npm run seed
 *
 * This script checks existing event types first and only creates
 * those that don't already exist (idempotent).
 */

import 'dotenv/config';
import { env } from '../config/env.js';
import { calcomService } from '../services/calcom.js';

interface SessionConfig {
  title: string;
  slug: string;
  description: string;
  lengthInMinutes: number;
  locations: { type: string; integration: string }[];
  bookingFields: Record<string, unknown>[];
  disableGuests: boolean;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
}

const SESSIONS: SessionConfig[] = [
  {
    title: 'Astrograma Natală și Karmică',
    slug: 'astrograma-natal-i-karmic',
    description:
      'Sesiune live în care aducem claritate și direcție prin înțelegerea astrogramei tale!\n\n' +
      'În această sesiune live, explorăm împreună harta ta natală – „poza cerului" din momentul nașterii tale. Fiecare planetă vorbește despre o parte din tine, de la felul în care iubești, până la cum îți exprimi talentele sau ce tipare te pot bloca.\n\n' +
      'Astrograma este mai mult decât o hartă - ea este un instrument profund de autocunoaștere care îți oferă răspunsuri clare despre:\n' +
      '• direcția ta profesională și resursele interioare\n' +
      '• tiparele în iubire și ce tip de partener ți se potrivește\n' +
      '• cum îți poți valorifica talentele și câștiga banii în mod benefic\n' +
      '• lecțiile și blocajele personale, dar și cum le poți depăși\n' +
      '• linia destinului și misiunea ta personală\n\n' +
      'Include și analiza transgenerațională a hărții tale.\n\n' +
      'Consultația este oferită prin Zoom.\n' +
      'Poți lua notițe, dacă dorești, iar sesiunea va fi înregistrată, cu acordul tău, pentru ca tu să o primești ulterior și să o poți reasculta.',
    lengthInMinutes: 120,
    locations: [{ type: 'integration', integration: 'cal-video' }],
    bookingFields: [
      { type: 'phone', slug: 'phone', name: 'phone', label: 'Număr telefon', required: true, placeholder: '+40712345678' },
      { type: 'text', slug: 'birth-date', name: 'birth-date', label: 'Data nașterii (zi/lună/an)', required: true, placeholder: '15.03.1990' },
      { type: 'text', slug: 'birth-place', name: 'birth-place', label: 'Locul nașterii (oraș, județ, țară)', required: true, placeholder: 'București, România' },
      { type: 'text', slug: 'birth-time', name: 'birth-time', label: 'Ora nașterii (format 24h sau AM/PM specificat)', required: true, placeholder: '14:30' },
    ],
    disableGuests: true,
    minimumBookingNotice: 480, // 8 hours
    beforeEventBuffer: 15,
    afterEventBuffer: 30,
  },
  {
    title: 'Astrograma Relațională',
    slug: 'astrograma-relationala',
    description:
      'Descoperă dinamicile relației voastre!\n\n' +
      'În această sesiune live, explorăm dinamicile profunde ale relației tale cu partenerul, părinții, copiii, prietenii sau orice altă persoană de interes.\n\n' +
      'Această sesiune este pentru tine dacă îți dorești:\n' +
      '• Să înțelegi tiparele și dinamicile subtile ale relației\n' +
      '• Să afli care este potențialul vostru împreună\n' +
      '• Să aduci claritate asupra punctelor de vulnerabilitate\n' +
      '• Să clarifici care sunt lecțiile pe care le puteți învăța împreună\n' +
      '• Să înțelegi ce rol aveți unul în evoluția celuilalt\n' +
      '• Să cunoști gradul vostru de compatibilitate și căile de evoluție\n\n' +
      'Astrologia nu oferă verdicte de compatibilitate, ci îți arată natura relației: ce vă apropie, ce vă provoacă, ce este necesar pentru ca relația să se maturizeze în mod armonios.\n\n' +
      'Poți solicita o Astrogramă Relațională pentru orice tip de relație - romantică, familială, profesională sau de prietenie.\n\n' +
      'Consultația este oferită prin Zoom.\n' +
      'Poți lua notițe, dacă dorești, iar sesiunea va fi înregistrată, cu acordul tău, pentru ca tu să o primești ulterior și să o poți reasculta.\n\n' +
      'Notă: Dacă nu cunoști ora nașterii, dar știi un interval, notează mijlocul intervalului. Dacă ora este complet necunoscută, folosește 12:00 (PM).',
    lengthInMinutes: 90,
    locations: [{ type: 'integration', integration: 'cal-video' }],
    bookingFields: [
      { type: 'phone', slug: 'phone', name: 'phone', label: 'Număr telefon', required: true, placeholder: '+40712345678' },
      { type: 'text', slug: 'birth-date', name: 'birth-date', label: 'Datele tale de naștere (data nașterii, ora și orașul / județul / țara)', required: true, placeholder: '15.03.1990, 14:30, București' },
      { type: 'text', slug: 'partner-birth', name: 'partner-birth', label: 'Datele partener (data nașterii, ora și orașul / județul / țara)', required: true, placeholder: '22.07.1988, 09:00, Cluj-Napoca' },
    ],
    disableGuests: true,
    minimumBookingNotice: 480,
    beforeEventBuffer: 15,
    afterEventBuffer: 30,
  },
  {
    title: 'Astrograma Previzională',
    slug: 'astrograma-previzionala',
    description:
      'Sesiune live în care studiem predispozițiile tale pe următorul an.\n\n' +
      'Această sesiune live îți oferă o privire detaliată asupra predispozițiilor și evenimentelor semnificative din următoarele 12 luni, așa cum se reflectă în harta ta natală.\n\n' +
      '• Vei înțelege ce teme sunt în prim-plan și cum le poți aborda în mod conștient\n' +
      '• Descoperi care sunt perioadele favorabile pentru relații, carieră, mutări, proiecte sau decizii importante\n' +
      '• Primești răspunsuri pentru întrebări concrete, pentru a-ți organiza cât mai bine planurile și resursele\n\n' +
      'Dacă ai întrebări legate de un eveniment trecut din viața ta și lecțiile pe care aveai nevoie să le înveți în urma sa, îl putem discuta, de asemenea.\n\n' +
      'Deși această analiză se axează, în principiu, pe tranzitele următoarelor 12 luni, dacă ai întrebări punctuale în privința unui eveniment mult mai în viitor, răspundem și acestor curiozități.\n\n' +
      'Este o experiență prin care primești ghidaj personalizat, menită să-ți aducă claritate și încredere în pașii pe care îi ai de făcut.\n\n' +
      'Consultația este oferită prin Zoom.\n' +
      'Poți lua notițe, dacă dorești, iar sesiunea va fi înregistrată, cu acordul tău, pentru ca tu să o primești ulterior și să o poți reasculta.',
    lengthInMinutes: 90,
    locations: [{ type: 'integration', integration: 'cal-video' }],
    bookingFields: [
      { type: 'phone', slug: 'phone', name: 'phone', label: 'Număr telefon', required: true, placeholder: '+40712345678' },
      { type: 'text', slug: 'birth-date', name: 'birth-date', label: 'Data nașterii (zi/lună/an)', required: true, placeholder: '15.03.1990' },
      { type: 'text', slug: 'birth-place', name: 'birth-place', label: 'Locul nașterii (oraș, județ, țară)', required: true, placeholder: 'București, România' },
      { type: 'text', slug: 'birth-time', name: 'birth-time', label: 'Ora nașterii (format 24h sau AM/PM specificat)', required: true, placeholder: '14:30' },
    ],
    disableGuests: true,
    minimumBookingNotice: 480,
    beforeEventBuffer: 15,
    afterEventBuffer: 30,
  },
];

async function seed() {
  console.log('🌱 Seeding Cal.com event types for AstroLumina...\n');
  console.log(`   API: ${env.CALCOM_BASE_URL}`);
  console.log(`   Version: ${env.CALCOM_API_VERSION}\n`);

  let existingTypes: { id: number; slug: string; title: string }[];

  try {
    existingTypes = await calcomService.getEventTypes();
    console.log(`   Found ${existingTypes.length} existing event type(s).\n`);
  } catch (error) {
    console.error('❌ Failed to fetch existing event types:', error);
    process.exit(1);
  }

  for (const session of SESSIONS) {
    const existing = existingTypes.find((et) => et.slug === session.slug);

    if (existing) {
      console.log(`   ⏭️  "${session.title}" already exists (id: ${existing.id}). Updating...`);

      try {
        await calcomService.updateEventType(existing.id, {
          title: session.title,
          length: session.lengthInMinutes,
          description: session.description,
          locations: session.locations,
          disableGuests: session.disableGuests,
          minimumBookingNotice: session.minimumBookingNotice,
          beforeEventBuffer: session.beforeEventBuffer,
          afterEventBuffer: session.afterEventBuffer,
          bookingFields: session.bookingFields,
        });
        console.log(`   ✅  Updated "${session.title}" (id: ${existing.id})\n`);
      } catch (error) {
        console.error(`   ❌  Failed to update "${session.title}":`, error, '\n');
      }
    } else {
      console.log(`   📝  Creating "${session.title}"...`);

      try {
        const created = await calcomService.createEventType({
          title: session.title,
          slug: session.slug,
          length: session.lengthInMinutes,
          description: session.description,
          locations: session.locations,
          disableGuests: session.disableGuests,
          minimumBookingNotice: session.minimumBookingNotice,
          beforeEventBuffer: session.beforeEventBuffer,
          afterEventBuffer: session.afterEventBuffer,
          bookingFields: session.bookingFields,
        });
        console.log(`   ✅  Created "${session.title}" (id: ${created.id})\n`);
      } catch (error) {
        console.error(`   ❌  Failed to create "${session.title}":`, error, '\n');
      }
    }
  }

  console.log('🌱 Seeding complete!\n');
}

seed().catch((error) => {
  console.error('❌ Seed script failed:', error);
  process.exit(1);
});
