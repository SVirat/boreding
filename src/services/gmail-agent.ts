import { getSecure, setSecure, deleteSecure } from './secure-storage';
import { findAirport, findAirportByCity, searchAirports } from './airports';
import { aiGenerate } from './ai-router';
import { Airport } from '../lib/types';

const TOKEN_STORAGE_KEY = 'boreding_gmail_token';

let storedAccessToken: string | null = null;

export interface FlightScanResult {
  departure: Airport | null;
  arrival: Airport | null;
  date: string | null;
  message?: string;
}

// ── Token Management (persisted in SecureStore) ──

export async function setAccessToken(token: string) {
  storedAccessToken = token;
  await setSecure(TOKEN_STORAGE_KEY, token);
}

export async function clearAccessToken() {
  storedAccessToken = null;
  await deleteSecure(TOKEN_STORAGE_KEY);
}

export function hasAccessToken(): boolean {
  return !!storedAccessToken;
}

export async function loadStoredToken(): Promise<string | null> {
  if (storedAccessToken) return storedAccessToken;
  const saved = await getSecure(TOKEN_STORAGE_KEY);
  if (saved) storedAccessToken = saved;
  return saved;
}

// ── Promotional Email Filter (ported from web) ──

function isPromotionalEmail(subject: string, body: string): boolean {
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase().slice(0, 2000);

  const promoSubjectKeywords = [
    'offer', 'sale', '% off', 'deal', 'discount', 'cashback', 'coupon',
    'lowest fare', 'cheap flight', 'grab ', 'hurry', 'limited time',
    'flash sale', 'save big', 'book now', 'special price', 'starting at',
    'fare alert', 'price drop', 'explore ', 'getaway', 'dream destination',
    'wanderlust', 'newsletter', 'subscribe', 'reward points',
  ];

  const promoSubjectHits = promoSubjectKeywords.filter((k) => subjectLower.includes(k)).length;
  if (promoSubjectHits >= 1) return true;

  const confirmKeywords = [
    'pnr', 'booking id', 'booking ref', 'reservation', 'e-ticket',
    'ticket number', 'booking confirmed', 'confirmation number',
    'itinerary', 'boarding pass', 'check-in', 'seat number',
    'passenger name', 'travel document', 'booking reference',
    'trip id', 'order id', 'receipt',
  ];
  const confirmHits = confirmKeywords.filter(
    (k) => subjectLower.includes(k) || bodyLower.includes(k)
  ).length;
  if (confirmHits >= 2) return false;

  const promoBodyKeywords = [
    'unsubscribe', 'view in browser', 'opt out', 'email preferences',
    'terms and conditions apply', 't&c apply', 'limited seats',
    'book your', 'plan your trip', 'explore destinations',
  ];
  const promoBodyHits = promoBodyKeywords.filter((k) => bodyLower.includes(k)).length;
  if (promoBodyHits >= 2 && confirmHits === 0) return true;

  return false;
}

// ── Regex Fallback Parser (ported from web) ──

const ROUTE_PATTERNS = [
  /depart(?:ure)?\s*(?:airport|city)?[:\s]+([A-Z]{3})[\s\S]{0,200}?arriv(?:al)?\s*(?:airport|city)?[:\s]+([A-Z]{3})/i,
  /origin[:\s]+([A-Z]{3})[\s\S]{0,200}?destination[:\s]+([A-Z]{3})/i,
  /from\s+[^(]{1,40}\(([A-Z]{3})\)[\s\S]{0,80}?to\s+[^(]{1,40}\(([A-Z]{3})\)/i,
  /from\s+([A-Z]{3})\s+to\s+([A-Z]{3})/i,
  /(?:flight|travel(?:ling)?|flying|journey)\s+from\s+([A-Z]{3})\s+to\s+([A-Z]{3})/i,
  /\b([A-Z]{3})\s*[→➜➔⟶➡►▶]\s*([A-Z]{3})\b/i,
  /\b([A-Z]{3})\s*[-–—]\s*([A-Z]{3})\b/i,
  /\b([A-Z]{3})\s+to\s+([A-Z]{3})\b/i,
];

const CITY_ROUTE_PATTERNS = [
  /depart(?:ure|ing)?\s*(?:from|city)?[:\s]+([A-Za-z\s]{3,30})[\s\S]{0,200}?arriv(?:al|ing)?\s*(?:at|in|city)?[:\s]+([A-Za-z\s]{3,30})/i,
  /origin[:\s]+([A-Za-z\s]{3,30})[\s\S]{0,200}?destination[:\s]+([A-Za-z\s]{3,30})/i,
  /from\s+([A-Za-z]{3,20})\s+to\s+([A-Za-z]{3,20})/i,
  /\b([A-Z][a-z]{2,15})\s*[→➜➔⟶➡►▶–—-]\s*([A-Z][a-z]{2,15})\b/,
  /(?:flight|travel(?:ling)?|flying|journey)\s+from\s+([A-Za-z]{3,20})\s+to\s+([A-Za-z]{3,20})/i,
];

function extractDate(text: string): string | null {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const dmy = text.match(
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i
  );
  if (dmy) return `${dmy[3]}-${monthNum(dmy[2])}-${dmy[1].padStart(2, '0')}`;
  const mdy = text.match(
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i
  );
  if (mdy) return `${mdy[3]}-${monthNum(mdy[1])}-${mdy[2].padStart(2, '0')}`;
  return null;
}

function monthNum(m: string): string {
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04',
    may: '05', jun: '06', jul: '07', aug: '08',
    sep: '09', oct: '10', nov: '11', dec: '12',
  };
  return months[m.toLowerCase().slice(0, 3)] ?? '01';
}

function resolveAirportByCity(cityName: string): Airport | null {
  const trimmed = cityName.trim();
  if (trimmed.length < 3) return null;
  const direct = findAirportByCity(trimmed);
  if (direct) return direct;
  // Fuzzy search fallback
  const results = searchAirports(trimmed);
  return (
    results.find((a) => a.city.toLowerCase() === trimmed.toLowerCase()) ??
    results.find(
      (a) =>
        a.city.toLowerCase().startsWith(trimmed.toLowerCase()) ||
        trimmed.toLowerCase().startsWith(a.city.toLowerCase())
    ) ??
    null
  );
}

function classifyCodeRole(
  text: string,
  code: string
): 'departure' | 'arrival' | 'unknown' {
  const codeIdx = text.toUpperCase().indexOf(code.toUpperCase());
  if (codeIdx === -1) return 'unknown';
  const before = text.slice(Math.max(0, codeIdx - 80), codeIdx).toLowerCase();
  const after = text.slice(codeIdx + code.length, codeIdx + code.length + 80).toLowerCase();
  const depKeywords = ['depart', 'departing', 'departure', 'origin', 'source', 'from', 'boarding'];
  const arrKeywords = ['arriv', 'arriving', 'arrival', 'destination', 'to', 'landing'];
  const depScore = depKeywords.filter((k) => before.includes(k) || after.includes(k)).length;
  const arrScore = arrKeywords.filter((k) => before.includes(k) || after.includes(k)).length;
  if (depScore > arrScore) return 'departure';
  if (arrScore > depScore) return 'arrival';
  return 'unknown';
}

interface EmailData {
  subject: string;
  body: string;
  internalDate?: string;
}

function parseFlightEmailsRegex(emails: EmailData[]): FlightScanResult {
  // Sort newest-first
  const sorted = [...emails].sort(
    (a, b) => Number(b.internalDate ?? 0) - Number(a.internalDate ?? 0)
  );

  // Pass 1: Try explicit route patterns
  for (const email of sorted) {
    if (isPromotionalEmail(email.subject, email.body)) continue;
    const combined = `${email.subject} ${email.body}`;

    for (const pattern of ROUTE_PATTERNS) {
      const match = combined.match(pattern);
      if (match) {
        const dep = findAirport(match[1].toUpperCase());
        const arr = findAirport(match[2].toUpperCase());
        if (dep && arr && dep.iata !== arr.iata) {
          return { departure: dep, arrival: arr, date: extractDate(combined) };
        }
      }
    }

    for (const pattern of CITY_ROUTE_PATTERNS) {
      const match = combined.match(pattern);
      if (match) {
        const dep = resolveAirportByCity(match[1]);
        const arr = resolveAirportByCity(match[2]);
        if (dep && arr && dep.iata !== arr.iata) {
          return { departure: dep, arrival: arr, date: extractDate(combined) };
        }
      }
    }
  }

  // Pass 2: Contextual IATA fallback
  for (const email of sorted) {
    if (isPromotionalEmail(email.subject, email.body)) continue;
    const combined = `${email.subject} ${email.body}`;

    const codeMatches = combined.match(/\b[A-Z]{3}\b/g);
    if (codeMatches) {
      const validAirports: { airport: Airport; role: 'departure' | 'arrival' | 'unknown' }[] = [];
      const seen = new Set<string>();
      for (const code of codeMatches) {
        if (seen.has(code)) continue;
        seen.add(code);
        const airport = findAirport(code);
        if (airport) {
          validAirports.push({ airport, role: classifyCodeRole(combined, code) });
        }
        if (validAirports.length >= 4) break;
      }

      if (validAirports.length >= 2) {
        const depCandidate = validAirports.find((a) => a.role === 'departure');
        const arrCandidate = validAirports.find((a) => a.role === 'arrival');

        if (depCandidate && arrCandidate && depCandidate.airport.iata !== arrCandidate.airport.iata) {
          return {
            departure: depCandidate.airport,
            arrival: arrCandidate.airport,
            date: extractDate(combined),
          };
        }

        return {
          departure: validAirports[0].airport,
          arrival: validAirports[1].airport,
          date: extractDate(combined),
        };
      }
    }
  }

  return { departure: null, arrival: null, date: null, message: 'No flight details found in your recent emails.' };
}

// ── Gmail API Helpers ──

function getSubject(msg: any): string {
  const headers = msg.payload?.headers || [];
  const subjectHeader = headers.find(
    (h: any) => h.name?.toLowerCase() === 'subject'
  );
  return subjectHeader?.value ?? '';
}

function extractText(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return stripHtml(decodeBase64(part.body.data));
      }
      if (part.parts) {
        const nested = extractText(part);
        if (nested) return nested;
      }
    }
  }
  return '';
}

function decodeBase64(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return atob(base64);
  } catch {
    return '';
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Main Scan Function ──

/**
 * Scan Gmail for flight booking emails and extract departure/arrival airports.
 * Uses a 2-tier strategy:
 *   1. AI-powered detection (primary)
 *   2. Regex parser fallback (if AI fails)
 * Promotional emails are filtered before both strategies.
 */
export async function scanGmailForFlights(
  accessToken?: string
): Promise<FlightScanResult> {
  const token = accessToken || storedAccessToken;
  if (!token) {
    throw new Error('Not authenticated. Please sign in first.');
  }

  // Search Gmail for flight-related emails (last 30 days)
  const query =
    '(flight OR boarding pass OR itinerary OR e-ticket OR PNR OR booking OR airline OR check-in OR departure OR arrival) newer_than:30d';
  const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query
  )}&maxResults=15`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.status === 401) {
    await clearAccessToken();
    throw new Error('Google session expired. Please sign in again.');
  }

  if (!searchRes.ok) {
    throw new Error('Failed to search Gmail.');
  }

  const searchData = await searchRes.json();
  const messages: Array<{ id: string }> = searchData.messages || [];

  if (messages.length === 0) {
    return {
      departure: null,
      arrival: null,
      date: null,
      message: 'No flight-related emails found in the last 30 days.',
    };
  }

  // Fetch up to 10 most recent emails (full content) — matching web app
  const rawEmails: Array<{ subject: string; body: string; internalDate?: string }> = [];
  for (const msg of messages.slice(0, 10)) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(
        msg.id
      )}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (msgRes.ok) {
      const msgData = await msgRes.json();
      const subject = getSubject(msgData);
      const body = extractText(msgData.payload);
      if (subject || body) {
        rawEmails.push({
          subject,
          body: body.slice(0, 3000),
          internalDate: msgData.internalDate,
        });
      }
    }
  }

  if (rawEmails.length === 0) {
    return {
      departure: null,
      arrival: null,
      date: null,
      message: 'Could not read email contents.',
    };
  }

  // Filter out promotional emails before AI analysis
  const confirmedEmails = rawEmails.filter(
    (email) => !isPromotionalEmail(email.subject, email.body)
  );

  if (confirmedEmails.length === 0) {
    return {
      departure: null,
      arrival: null,
      date: null,
      message: 'No confirmed flight emails found in the last 30 days.',
    };
  }

  // ── STRATEGY 1: AI-powered detection (primary) ──
  const aiResult = await detectFlightWithAI(confirmedEmails);
  if (aiResult && aiResult.departure && aiResult.arrival) {
    return aiResult;
  }

  // ── STRATEGY 2: Regex parser fallback ──
  return parseFlightEmailsRegex(confirmedEmails);
}

// ── AI Detection ──

async function detectFlightWithAI(
  emails: EmailData[]
): Promise<FlightScanResult | null> {
  const today = new Date().toISOString().slice(0, 10);
  const summaries = emails
    .map((e) => `Subject: ${e.subject}\n${e.body.slice(0, 2000)}`)
    .join('\n\n---\n\n');

  if (!summaries.trim()) return null;

  const prompt = `You are a flight booking email analyzer. Today's date is ${today}.

I will give you the contents of several emails from a user's inbox. Your job:
1. Identify ONLY confirmed flight booking emails (booking confirmations, e-tickets, itineraries, boarding passes, check-in notifications). Ignore promotional emails, fare alerts, offers, newsletters, and ads.
2. From the confirmed bookings, extract the departure city/airport and arrival city/airport, and the flight date (YYYY-MM-DD).
3. CRITICAL: The direction matters! In "BLR to HYD" or "BLR - HYD", BLR is the DEPARTURE and HYD is the ARRIVAL. The first city/code is ALWAYS the departure, the second is ALWAYS the arrival. Do NOT reverse them.
4. Pick the BEST flight using this priority:
   a. The nearest UPCOMING flight (flight date >= ${today}) — i.e. the soonest future flight.
   b. If no upcoming flights exist, pick the most RECENT past flight (flight date < ${today}, closest to today).
   c. If no confirmed flight bookings are found at all, say so.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"departure_iata":"XXX","departure_city":"CityName","arrival_iata":"YYY","arrival_city":"CityName","flight_date":"YYYY-MM-DD","status":"upcoming|past|none"}

If status is "none", set all other fields to empty strings.
If you know the IATA code, provide it. If you only know the city name, leave the IATA as empty string and fill the city name.

EMAILS:
${summaries}`;

  try {
    const raw = await aiGenerate({
      prompt,
      maxTokens: 200,
      temperature: 0.1,
      timeout: 30_000,
    });

    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.status === 'none') {
      return {
        departure: null,
        arrival: null,
        date: null,
        message: 'No confirmed flight bookings found in your recent emails.',
      };
    }

    const dep =
      (parsed.departure_iata && findAirport(parsed.departure_iata)) ||
      (parsed.departure_city && resolveAirportByCity(parsed.departure_city)) ||
      null;
    const arr =
      (parsed.arrival_iata && findAirport(parsed.arrival_iata)) ||
      (parsed.arrival_city && resolveAirportByCity(parsed.arrival_city)) ||
      null;

    if (dep && arr && dep.iata !== arr.iata) {
      return {
        departure: dep,
        arrival: arr,
        date: parsed.flight_date || null,
      };
    }

    return null; // Fall through to regex parser
  } catch {
    return null; // Fall through to regex parser
  }
}
