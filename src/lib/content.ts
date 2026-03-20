import { ContentSection } from './types';

const SECTION_TEMPLATES = [
  { id: 'overview', title: 'Destination Overview', icon: 'globe', weight: 0.12, priority: 1 },
  { id: 'culture', title: 'Culture & People', icon: 'users', weight: 0.14, priority: 1 },
  { id: 'food', title: 'Food & Cuisine', icon: 'fork-knife', weight: 0.14, priority: 1 },
  { id: 'attractions', title: 'Must-See Attractions', icon: 'map-pin', weight: 0.14, priority: 1 },
  { id: 'practical', title: 'Practical Tips', icon: 'lightbulb', weight: 0.10, priority: 2 },
  { id: 'history', title: 'History & Heritage', icon: 'clock', weight: 0.12, priority: 2 },
  { id: 'language', title: 'Language & Phrases', icon: 'chat', weight: 0.10, priority: 2 },
  { id: 'hidden-gems', title: 'Hidden Gems & Secrets', icon: 'sparkle', weight: 0.14, priority: 2 },
  { id: 'neighborhoods', title: 'Neighborhoods & Districts', icon: 'map-pin', weight: 0.12, priority: 3 },
  { id: 'itinerary', title: 'Suggested Itineraries', icon: 'sparkle', weight: 0.14, priority: 3 },
  { id: 'shopping', title: 'Shopping & Souvenirs', icon: 'globe', weight: 0.10, priority: 3 },
  { id: 'nature', title: 'Nature & Outdoors', icon: 'globe', weight: 0.12, priority: 3 },
  { id: 'nightlife', title: 'Nightlife & Entertainment', icon: 'sparkle', weight: 0.10, priority: 4 },
  { id: 'festivals', title: 'Festivals & Events', icon: 'users', weight: 0.10, priority: 4 },
  { id: 'etiquette', title: 'Local Etiquette & Customs', icon: 'lightbulb', weight: 0.10, priority: 4 },
  { id: 'daytrips', title: 'Day Trips & Excursions', icon: 'map-pin', weight: 0.12, priority: 4 },
];

const TOPIC_ICONS = ['globe', 'lightbulb', 'sparkle', 'clock', 'chat', 'users', 'map-pin', 'fork-knife'];
const MAX_WORDS_PER_SECTION = 2500;
const MIN_WORDS_PER_SECTION = 400;

export function buildSectionAllocations(totalReadingMinutes: number) {
  let maxPriority: number;
  if (totalReadingMinutes < 30) maxPriority = 1;
  else if (totalReadingMinutes < 90) maxPriority = 2;
  else if (totalReadingMinutes < 240) maxPriority = 3;
  else maxPriority = 4;

  const templates = SECTION_TEMPLATES.filter((t) => t.priority <= maxPriority);
  const totalWeight = templates.reduce((s, t) => s + t.weight, 0);

  return templates.map((t) => {
    const rawMinutes = (t.weight / totalWeight) * totalReadingMinutes;
    const estimatedMinutes = Math.max(3, Math.min(12, Math.round(rawMinutes)));
    return { id: t.id, title: t.title, icon: t.icon, estimatedMinutes };
  });
}

export function sectionTargetWords(estimatedMinutes: number): number {
  const raw = Math.round(estimatedMinutes * 200);
  return Math.max(MIN_WORDS_PER_SECTION, Math.min(MAX_WORDS_PER_SECTION, raw));
}

export function buildBatchPrompt(
  destination: string,
  country: string,
  allocations: { id: string; title: string; icon: string; estimatedMinutes: number }[]
): string {
  const sectionDescriptions = allocations
    .map((a) => `- "${a.title}" (id: ${a.id}, WRITE EXACTLY ~${sectionTargetWords(a.estimatedMinutes)} words)`)
    .join('\n');
  const totalWords = allocations.reduce((sum, a) => sum + sectionTargetWords(a.estimatedMinutes), 0);

  return `You are a brilliant travel writer and educator. Write ALL of the following sections about ${destination}, ${country} for an air traveler who has a long flight ahead.

SECTIONS TO WRITE (total ~${totalWords} words across all sections):
${sectionDescriptions}

FORMAT: Separate each section with the delimiter on its own line:
---SECTION: <id>---

CRITICAL RULES:
- You MUST write ALL ${allocations.length} sections listed above. Do NOT skip any.
- Each section MUST hit its target word count. Write in-depth, detailed content.
- Use the exact section delimiter format shown above before EACH section.

Guidelines:
- Write in an engaging, conversational yet informative tone
- Include specific names, places, prices, and practical details
- Use markdown ## for sub-headings within each section
- Include "Did you know?" or "Pro tip:" callouts naturally in every section
- Do NOT include the section title as a header (it's already shown in the UI)
- Start each section directly with the content

Write all ${allocations.length} sections now:`;
}

export function buildQuizPrompt(destination: string, country: string, sections: ContentSection[]): string {
  const completedContent = sections
    .map((s) => `[${s.title}]: ${s.content.substring(0, 500)}`)
    .join('\n\n');

  return `Based on the following travel content about ${destination}, ${country}, generate exactly 5 multiple-choice quiz questions.

CONTENT SUMMARIES:
${completedContent}

Return ONLY valid JSON in this exact format (no markdown, no code fences):
[
  { "id": 1, "question": "Question text here?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctIndex": 0 }
]

Rules:
- Questions should test knowledge from the content
- Each question has exactly 4 options
- correctIndex is 0-based
- Make questions interesting and varied in difficulty
- Return ONLY the JSON array, nothing else`;
}

export function buildTopicValidationPrompt(topic: string): string {
  return `You are a content validation assistant. A user wants to learn about: "${topic}"

Determine if this is a valid, meaningful topic.

VALID examples: "Machine Learning", "Ancient Rome", "Guitar basics"
INVALID examples: "asdfghjk", "???!!!", random gibberish

Respond with ONLY valid JSON (no markdown, no code fences):
{"valid": true, "topic": "cleaned topic name"}
or
{"valid": false, "reason": "Brief explanation"}`;
}

export function buildTopicSectionsPrompt(topic: string, sectionCount: number): string {
  return `You are a curriculum designer. Create exactly ${sectionCount} section titles for a guide about: "${topic}"

Respond with ONLY valid JSON (no markdown, no code fences):
[{"id": "section-1", "title": "Section Title Here"}]

Rules:
- Exactly ${sectionCount} sections
- Titles should be concise (3-6 words)
- Progress from intro/basics to deeper/advanced
- Return ONLY the JSON array`;
}

export function buildTopicBatchPrompt(
  topic: string,
  allocations: { id: string; title: string; icon: string; estimatedMinutes: number }[]
): string {
  const sectionDescriptions = allocations
    .map((a) => `- "${a.title}" (id: ${a.id}, WRITE EXACTLY ~${sectionTargetWords(a.estimatedMinutes)} words)`)
    .join('\n');
  const totalWords = allocations.reduce((sum, a) => sum + sectionTargetWords(a.estimatedMinutes), 0);

  return `You are a brilliant educator. Write ALL of the following sections about "${topic}" for a reader on a long flight.

SECTIONS TO WRITE (total ~${totalWords} words):
${sectionDescriptions}

FORMAT: Separate each section with:
---SECTION: <id>---

CRITICAL RULES:
- Write ALL ${allocations.length} sections. Do NOT skip any.
- Each section MUST hit its target word count.
- Use markdown ## for sub-headings
- Include "Did you know?" or "Pro tip:" callouts
- Do NOT include the section title as a header

Write all ${allocations.length} sections now:`;
}

export function buildTopicQuizPrompt(topic: string, sections: ContentSection[]): string {
  const completedContent = sections
    .map((s) => `[${s.title}]: ${s.content.substring(0, 500)}`)
    .join('\n\n');

  return `Based on the following educational content about "${topic}", generate exactly 5 multiple-choice quiz questions.

CONTENT SUMMARIES:
${completedContent}

Return ONLY valid JSON (no markdown, no code fences):
[{ "id": 1, "question": "Question text?", "options": ["A", "B", "C", "D"], "correctIndex": 0 }]

Rules:
- Questions should test knowledge from the content
- Each question has exactly 4 options
- correctIndex is 0-based
- Return ONLY the JSON array`;
}

export function buildTopicAllocations(
  totalReadingMinutes: number,
  sectionTitles: { id: string; title: string }[]
) {
  const count = sectionTitles.length;
  const perSection = Math.max(3, Math.min(12, Math.round(totalReadingMinutes / count)));
  return sectionTitles.map((s, i) => ({
    id: s.id,
    title: s.title,
    icon: TOPIC_ICONS[i % TOPIC_ICONS.length],
    estimatedMinutes: perSection,
  }));
}

export function getSectionCount(totalReadingMinutes: number): number {
  if (totalReadingMinutes < 30) return 4;
  if (totalReadingMinutes < 90) return 8;
  if (totalReadingMinutes < 240) return 12;
  return 16;
}
