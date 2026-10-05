import type { Subject } from '@/lib/types';

/**
 * The subject taxonomy used by the Personalized Feed Setup, post topics and book categories.
 * Ids are stable and stored in Firestore — rename labels freely, never ids.
 */
export const SUBJECTS: Subject[] = [
  { id: 'history', name: 'History', emoji: '📜' },
  {
    id: 'biology', name: 'Biology', emoji: '🧬',
    nicheTopics: [
      { id: 'genetics', name: 'Genetics', emoji: '🔬' },
      { id: 'marine-biology', name: 'Marine Biology', emoji: '🐠' },
      { id: 'botany', name: 'Botany', emoji: '🌿' },
      { id: 'zoology', name: 'Zoology', emoji: '🐅' },
      { id: 'ecology', name: 'Ecology', emoji: '🌳' },
    ],
  },
  {
    id: 'gastronomy', name: 'Gastronomy', emoji: '🍲',
    nicheTopics: [
      { id: 'baking', name: 'Baking', emoji: '🥐' },
      { id: 'world-cuisines', name: 'World Cuisines', emoji: '🌍' },
      { id: 'food-science', name: 'Food Science', emoji: '🧪' },
      { id: 'mixology', name: 'Mixology', emoji: '🍹' },
    ],
  },
  {
    id: 'physics', name: 'Physics', emoji: '⚛️',
    nicheTopics: [
      { id: 'astrophysics', name: 'Astrophysics', emoji: '✨' },
      { id: 'quantum-mechanics', name: 'Quantum Mechanics', emoji: '🔬' },
      { id: 'natural-forces', name: 'Natural Forces', emoji: '💨' },
      { id: 'cosmology', name: 'Cosmology & Universe', emoji: '🌌' },
      { id: 'thermodynamics', name: 'Thermodynamics', emoji: '🔥' },
      { id: 'electricity', name: 'Electricity & Magnetism', emoji: '⚡' },
    ],
  },
  {
    id: 'chemistry', name: 'Chemistry', emoji: '🧪',
    nicheTopics: [
      { id: 'organic-chemistry', name: 'Organic Chemistry', emoji: '⌬' },
      { id: 'biochemistry', name: 'Biochemistry', emoji: '💊' },
      { id: 'physical-chemistry', name: 'Physical Chemistry', emoji: '🌡️' },
    ],
  },
  {
    id: 'mathematics', name: 'Mathematics', emoji: '🧮',
    nicheTopics: [
      { id: 'calculus', name: 'Calculus', emoji: '∫' },
      { id: 'statistics', name: 'Statistics', emoji: '📊' },
      { id: 'algebra', name: 'Algebra', emoji: '📈' },
      { id: 'geometry', name: 'Geometry', emoji: '📐' },
      { id: 'number-theory', name: 'Number Theory', emoji: '🔢' },
    ],
  },
  {
    id: 'languages', name: 'Languages', emoji: '🗣️',
    nicheTopics: [
      { id: 'spanish', name: 'Spanish', emoji: '🇪🇸' },
      { id: 'japanese', name: 'Japanese', emoji: '🇯🇵' },
      { id: 'french', name: 'French', emoji: '🇫🇷' },
      { id: 'german', name: 'German', emoji: '🇩🇪' },
      { id: 'linguistics', name: 'Linguistics', emoji: '💬' },
    ],
  },
  {
    id: 'business', name: 'Business', emoji: '💼',
    nicheTopics: [
      { id: 'management', name: 'Management', emoji: '📈' },
      { id: 'finance-accounting', name: 'Finance & Accounting', emoji: '💰' },
      { id: 'marketing', name: 'Marketing', emoji: '📢' },
      { id: 'entrepreneurship', name: 'Entrepreneurship', emoji: '💡' },
      { id: 'economics', name: 'Economics', emoji: '💹' },
    ],
  },
  {
    id: 'self-development', name: 'Self Development', emoji: '🌱',
    nicheTopics: [
      { id: 'productivity', name: 'Productivity', emoji: '⏱️' },
      { id: 'habits', name: 'Habits', emoji: '🔁' },
      { id: 'communication', name: 'Communication', emoji: '🎙️' },
      { id: 'leadership', name: 'Leadership', emoji: '🧭' },
      { id: 'learning-how-to-learn', name: 'Learning How to Learn', emoji: '🧠' },
    ],
  },
  { id: 'politics', name: 'Politics', emoji: '🏛️' },
  {
    id: 'philosophy', name: 'Philosophy', emoji: '🤔',
    nicheTopics: [
      { id: 'ethics', name: 'Ethics', emoji: '⚖️' },
      { id: 'stoicism', name: 'Stoicism', emoji: '🗿' },
      { id: 'logic', name: 'Logic', emoji: '🔣' },
      { id: 'philosophy-of-science', name: 'Philosophy of Science', emoji: '🔭' },
    ],
  },
  {
    id: 'technology', name: 'Technology', emoji: '💻',
    nicheTopics: [
      { id: 'ai', name: 'Artificial Intelligence', emoji: '🤖' },
      { id: 'software-dev', name: 'Software Development', emoji: '👨‍💻' },
      { id: 'cybersecurity', name: 'Cybersecurity', emoji: '🛡️' },
      { id: 'data-science', name: 'Data Science', emoji: '📉' },
      { id: 'web-development', name: 'Web Development', emoji: '🌐' },
    ],
  },
  {
    id: 'arts-culture', name: 'Arts & Culture', emoji: '🎭',
    nicheTopics: [
      { id: 'music', name: 'Music', emoji: '🎵' },
      { id: 'visual-arts', name: 'Visual Arts', emoji: '🎨' },
      { id: 'literature', name: 'Literature', emoji: '📚' },
      { id: 'film-studies', name: 'Film Studies', emoji: '🎬' },
      { id: 'theater', name: 'Theatre', emoji: '🎟️' },
    ],
  },
  { id: 'education', name: 'Education', emoji: '🎓' },
  { id: 'psychology', name: 'Psychology', emoji: '🧠' },
  { id: 'science', name: 'Science', emoji: '🔬' },
  {
    id: 'geography', name: 'Geography', emoji: '🗺️',
    nicheTopics: [
      { id: 'cartography', name: 'Cartography', emoji: '🧭' },
      { id: 'human-geography', name: 'Human Geography', emoji: '🏘️' },
      { id: 'physical-geography', name: 'Physical Geography', emoji: '🌋' },
    ],
  },
  {
    id: 'environmental-science', name: 'Environmental Science', emoji: '🏞️',
    nicheTopics: [
      { id: 'climate-change', name: 'Climate Change', emoji: '🌡️' },
      { id: 'conservation', name: 'Conservation', emoji: '🐼' },
    ],
  },
  {
    id: 'engineering', name: 'Engineering', emoji: '⚙️',
    nicheTopics: [
      { id: 'mechanical-eng', name: 'Mechanical Engineering', emoji: '🔩' },
      { id: 'civil-eng', name: 'Civil Engineering', emoji: '🏗️' },
      { id: 'electrical-eng', name: 'Electrical Engineering', emoji: '💡' },
      { id: 'aerospace-eng', name: 'Aerospace Engineering', emoji: '🚀' },
    ],
  },
  {
    id: 'medicine', name: 'Medicine', emoji: '⚕️',
    nicheTopics: [
      { id: 'anatomy', name: 'Anatomy', emoji: '🦴' },
      { id: 'pharmacology', name: 'Pharmacology', emoji: '💊' },
      { id: 'neurology', name: 'Neurology', emoji: '🧠' },
    ],
  },
  { id: 'law', name: 'Law', emoji: '⚖️' },
  { id: 'sociology', name: 'Sociology', emoji: '🫂' },
  { id: 'anthropology', name: 'Anthropology', emoji: '🗿' },
  { id: 'archaeology', name: 'Archaeology', emoji: '🏺' },
  { id: 'music-theory', name: 'Music Theory', emoji: '🎼' },
  { id: 'graphic-design', name: 'Graphic Design', emoji: '✒️' },
  { id: 'creative-writing', name: 'Creative Writing', emoji: '✍️' },
  { id: 'astronomy', name: 'Astronomy', emoji: '🔭' },
  { id: 'mythology', name: 'Mythology', emoji: '🦄' },
  { id: 'robotics', name: 'Robotics', emoji: '🦾' },
  { id: 'nutrition', name: 'Nutrition', emoji: '🍎' },
  { id: 'sports-science', name: 'Sports Science', emoji: '🏅' },
  { id: 'architecture', name: 'Architecture', emoji: '🏛️' },
  { id: 'fashion-design', name: 'Fashion Design', emoji: '👗' },
  { id: 'journalism', name: 'Journalism', emoji: '📰' },
  { id: 'cryptography', name: 'Cryptography', emoji: '🔑' },
  { id: 'game-development', name: 'Game Development', emoji: '🎮' },
  { id: 'urban-planning', name: 'Urban Planning', emoji: '🏙️' },
];

export interface TopicInfo {
  id: string;
  name: string;
  emoji: string;
  /** Parent subject id for niche topics. */
  parentId?: string;
}

const TOPIC_INDEX: Map<string, TopicInfo> = new Map();
for (const subject of SUBJECTS) {
  TOPIC_INDEX.set(subject.id, { id: subject.id, name: subject.name, emoji: subject.emoji });
  for (const niche of subject.nicheTopics ?? []) {
    TOPIC_INDEX.set(niche.id, { ...niche, parentId: subject.id });
  }
}

export const ALL_TOPIC_IDS = Array.from(TOPIC_INDEX.keys());

export function getTopic(id: string): TopicInfo | undefined {
  return TOPIC_INDEX.get(id);
}

export function topicLabel(id: string): string {
  return TOPIC_INDEX.get(id)?.name ?? id;
}

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

/** Minimum number of interests required by the Personalized Feed Setup. */
export const MIN_INTERESTS = 3;

/**
 * Turns a user's chosen interests into the topic sets the feed queries.
 *
 * - primary: what they picked. Picking a whole subject (e.g. Physics) includes all of its niches.
 * - adjacent: sibling niches of niches they picked (picked Astrophysics → Cosmology is adjacent).
 *   These are mixed in occasionally so the feed widens knowledge without drifting off-topic.
 */
export function expandInterests(interests: string[]): { primary: string[]; adjacent: string[] } {
  const primary = new Set<string>();
  for (const id of interests) {
    const topic = TOPIC_INDEX.get(id);
    if (!topic) continue;
    primary.add(id);
    if (!topic.parentId) {
      for (const niche of getSubject(id)?.nicheTopics ?? []) primary.add(niche.id);
    }
  }

  const adjacent = new Set<string>();
  for (const id of interests) {
    const parentId = TOPIC_INDEX.get(id)?.parentId;
    if (!parentId) continue;
    adjacent.add(parentId);
    for (const sibling of getSubject(parentId)?.nicheTopics ?? []) {
      if (!primary.has(sibling.id)) adjacent.add(sibling.id);
    }
  }
  for (const id of primary) adjacent.delete(id);

  return { primary: Array.from(primary), adjacent: Array.from(adjacent) };
}

/** Best-effort mapping of free-text subjects (e.g. from Open Library) onto our topic ids. */
export function topicsFromText(subjects: string[], max = 3): string[] {
  const haystack = subjects.join(' | ').toLowerCase();
  const matches: string[] = [];
  for (const [id, info] of TOPIC_INDEX) {
    const name = info.name.toLowerCase().replace(/ & .*/, '');
    if (name.length >= 4 && haystack.includes(name)) matches.push(id);
  }
  // Prefer specific niches over whole subjects.
  matches.sort((a, b) => Number(Boolean(TOPIC_INDEX.get(b)?.parentId)) - Number(Boolean(TOPIC_INDEX.get(a)?.parentId)));
  return matches.slice(0, max);
}

/** Topic ids whose name (in any supported language) matches a search term. */
export function topicsMatching(term: string, names: (id: string) => string[]): string[] {
  const q = term.trim().toLowerCase();
  if (q.length < 3) return [];
  return ALL_TOPIC_IDS.filter((id) => names(id).some((n) => { const name = n.toLowerCase(); return name.includes(q) || (name.length >= 4 && q.includes(name)); }));
}
