export interface KSACSocietyConfig {
  name: string;
  room: string;
  category: string;
}

export const KSAC_SOCIETIES: KSACSocietyConfig[] = [
  { name: "KIIT Intl. Student Society", room: "KSAC Room 101 (International Lounge)", category: "Cultural & International" },
  { name: "KIIT Film Society", room: "KSAC Room 102 (Film & Media Studio)", category: "Media & Arts" },
  { name: "Kalakaar", room: "KSAC Room 103 (Dramatics & Theatre Bay)", category: "Performing Arts" },
  { name: "TEDx KIIT University", room: "KSAC Room 104 (Idea & Speaker Incubator)", category: "Leadership & Ideas" },
  { name: "KSHITIJ", room: "KSAC Room 105 (Literature & Cultural Bay)", category: "Literature & Culture" },
  { name: "Kronicle", room: "KSAC Room 106 (Debating & MUN Hall)", category: "Debating & Literary" },
  { name: "Kraya & Kuber", room: "KSAC Room 201 (Finance & Economics Bay)", category: "Finance & Commerce" },
  { name: "Kraftovity", room: "KSAC Room 202 (Arts & Craft Atelier)", category: "Fine Arts" },
  { name: "KORUS", room: "KSAC Room 203 (Music Jam Room & Audio Studio)", category: "Music & Performing Arts" },
  { name: "Khwahishein", room: "KSAC Room 204 (Hindi Literary & Poetry Cell)", category: "Literary" },
  { name: "Keurig", room: "KSAC Room 205 (Culinary & Hospitality Hub)", category: "Lifestyle & Hospitality" },
  { name: "Kalliope", room: "KSAC Room 206 (Poetry & Creative Expression Wing)", category: "Literary & Poetry" },
  { name: "KAEWS", room: "KSAC Room 207 (Animal Welfare & Eco Cell)", category: "Social Welfare & Environment" },
  { name: "ENACTUS KISS-KIIT", room: "KSAC Room 301 (Social Entrepreneurship Lab)", category: "Social Entrepreneurship" },
  { name: "Kamakshi & HeForShe", room: "KSAC Room 302 (Gender Equality & Social Cell)", category: "Social & Community" },
  { name: "SPIC MACAY", room: "KSAC Room 303 (Classical Heritage & Music Room)", category: "Heritage & Culture" },
  { name: "Qutopia", room: "KSAC Room 304 (Quizzing & Trivia Den)", category: "Knowledge & Quizzing" },
  { name: "Kreative Eye", room: "KSAC Room 305 (Photography & Visual Design Studio)", category: "Visual Arts & Photography" },
  { name: "KIIT Wordsmith", room: "KSAC Room 306 (Writing & Editorial Guild)", category: "Editorial & Writing" },
  { name: "KIIT INT- MUN Society", room: "KSAC Room 307 (Model United Nations Chamber)", category: "International Relations & MUN" },
  { name: "Khwaab", room: "KSAC Room 401 (Dance & Choreography Bay)", category: "Dance & Choreography" },
  { name: "Kimaya", room: "KSAC Room 402 (Medical & First Aid Society)", category: "Health & First Aid" },
  { name: "Kzarshion", room: "KSAC Room 403 (Fashion & Lifestyle Studio)", category: "Fashion & Design" },
  { name: "IOT", room: "KSAC Room 404 (IoT & Embedded Systems Lab)", category: "Technology & Hardware" },
  { name: "K - 1000", room: "KSAC Room 405 (Community Outreach & Tech Wing)", category: "Tech & Outreach" },
  { name: "FED", room: "KSAC Room 406 (Front-End & App Developers Bay)", category: "Software Development" },
  { name: "Cyber Vault", room: "KSAC Room 407 (Cybersecurity & Ethical Hacking Lab)", category: "Cybersecurity" },
  { name: "KIIT Electrical Society", room: "KSAC Room 501 (Electrical & Hardware Lab)", category: "Engineering & Hardware" },
  { name: "KIIT Robotics Society", room: "KSAC Room 502 (Robotics & Automation Hub)", category: "Robotics & AI" },
  { name: "Konnexions", room: "KSAC Room 503 (Web Development & Tech Society)", category: "Web & Computing" },
  { name: "KIIT Society For Civil Engineers", room: "KSAC Room 504 (Structural Design & CAD Lab)", category: "Engineering & Design" },
];

export const KSAC_CENTRAL_ROOMS = [
  "KSAC Central Auditorium (Main Stage)",
  "KSAC Conference Boardroom (Meeting Room A)",
  "KSAC Multipurpose Exhibition Hall"
];

// Standard clock time slots from 08:00 AM to 07:00 PM (19:00 max cutoff)
export const CLOCK_START_TIMES = [
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM"
];

export const CLOCK_END_TIMES = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM"
];

export const MAX_CLOSING_TIME = "07:00 PM"; // 19:00 (1140 minutes)
export const MIN_DURATION_MINUTES = 60; // 1 hour minimum

/**
 * Converts a time string (e.g. "09:30 AM", "02:00 PM", "14:00", "7:00 PM") to minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const str = timeStr.trim().toUpperCase();

  // Match 12-hour format: HH:MM AM/PM
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const min = parseInt(match12[2], 10);
    const meridiem = match12[3];

    if (hour === 12) {
      hour = meridiem === "AM" ? 0 : 12;
    } else if (meridiem === "PM") {
      hour += 12;
    }
    return hour * 60 + min;
  }

  // Match 24-hour format: HH:MM
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const min = parseInt(match24[2], 10);
    return hour * 60 + min;
  }

  return null;
}

/**
 * Formats minutes from midnight to a standard 12-hour time string (e.g. 840 -> "02:00 PM").
 */
export function formatMinutesToTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hh = h12 < 10 ? `0${h12}` : `${h12}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm} ${meridiem}`;
}

/**
 * Validates requested room booking times:
 * 1. Must be valid times.
 * 2. Start time must be before End time.
 * 3. Minimum booking duration must be at least 1 hour (60 minutes).
 * 4. End time cannot exceed 07:00 PM (1140 minutes).
 * 5. Start time cannot be earlier than 08:00 AM (480 minutes).
 */
export function validateBookingTimeWindow(
  startTimeStr: string,
  endTimeStr: string
): {
  valid: boolean;
  error?: string;
  startMinutes?: number;
  endMinutes?: number;
  durationMinutes?: number;
  formattedTimeslot?: string;
} {
  const startMinutes = parseTimeToMinutes(startTimeStr);
  const endMinutes = parseTimeToMinutes(endTimeStr);

  if (startMinutes === null) {
    return { valid: false, error: `Invalid start time format: "${startTimeStr}".` };
  }
  if (endMinutes === null) {
    return { valid: false, error: `Invalid end time format: "${endTimeStr}".` };
  }

  const OPENING_MINUTES = 8 * 60; // 08:00 AM (480 min)
  const CLOSING_MINUTES = 19 * 60; // 07:00 PM (1140 min)

  if (startMinutes < OPENING_MINUTES) {
    return {
      valid: false,
      error: "KSAC room bookings cannot start earlier than 08:00 AM.",
    };
  }

  if (endMinutes > CLOSING_MINUTES) {
    return {
      valid: false,
      error: "No one can book a room beyond 07:00 PM. KSAC rooms strictly close at 07:00 PM.",
    };
  }

  if (endMinutes <= startMinutes) {
    return {
      valid: false,
      error: "End time must be after start time.",
    };
  }

  const duration = endMinutes - startMinutes;
  if (duration < MIN_DURATION_MINUTES) {
    return {
      valid: false,
      error: `Minimum booking duration is 1 hour (60 minutes). Selected duration is ${duration} minutes.`,
    };
  }

  const formattedStart = formatMinutesToTime(startMinutes);
  const formattedEnd = formatMinutesToTime(endMinutes);

  return {
    valid: true,
    startMinutes,
    endMinutes,
    durationMinutes: duration,
    formattedTimeslot: `${formattedStart} - ${formattedEnd}`,
  };
}

export function getAllocatedRoomForSociety(societyName: string): string {
  const match = KSAC_SOCIETIES.find(
    s => s.name.toLowerCase() === societyName.toLowerCase() ||
         societyName.toLowerCase().includes(s.name.toLowerCase()) ||
         s.name.toLowerCase().includes(societyName.toLowerCase())
  );
  return match ? match.room : "KSAC General Activity Room";
}
