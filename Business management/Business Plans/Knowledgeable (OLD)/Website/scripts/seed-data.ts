/**
 * Seed content for Knowledgeable.
 *
 * READABLE_BOOKS are imported in full from Project Gutenberg. Every one is public domain
 * worldwide (author AND translator died more than 70 years ago), so they can be offered in the
 * reader in the UK/EU as well as the US. Check this rule before adding more titles.
 */

export interface ReadableBookSeed {
  id: string;
  gutenbergId: number;
  /** Must appear in the Gutenberg "Title:" line — guards against a wrong id. */
  expectTitle: string;
  title: string;
  author: string;
  publishedYear: string;
  topics: string[];
  description: string;
}

export const READABLE_BOOKS: ReadableBookSeed[] = [
  {
    id: 'meditations', gutenbergId: 2680, expectTitle: 'Meditations',
    title: 'Meditations', author: 'Marcus Aurelius (trans. George Long)', publishedYear: 'c. 180',
    topics: ['philosophy', 'stoicism', 'self-development'],
    description: 'Private notes the Roman emperor wrote to himself on self-discipline, duty and staying calm in the face of what you cannot control.',
  },
  {
    id: 'the-republic', gutenbergId: 1497, expectTitle: 'The Republic',
    title: 'The Republic', author: 'Plato (trans. Benjamin Jowett)', publishedYear: 'c. 375 BC',
    topics: ['philosophy', 'politics', 'ethics'],
    description: 'A Socratic dialogue concerning justice, the order and character of the just city-state, and the just man.',
  },
  {
    id: 'origin-of-species', gutenbergId: 1228, expectTitle: 'Origin of Species',
    title: 'On the Origin of Species', author: 'Charles Darwin', publishedYear: '1859',
    topics: ['biology', 'ecology', 'science'],
    description: 'The first edition of the book that introduced evolution by natural selection, argued from pigeons, barnacles and islands.',
  },
  {
    id: 'flatland', gutenbergId: 201, expectTitle: 'Flatland',
    title: 'Flatland: A Romance of Many Dimensions', author: 'Edwin A. Abbott', publishedYear: '1884',
    topics: ['mathematics', 'geometry', 'literature'],
    description: 'A square living in a two-dimensional world is visited by a sphere — a playful way into higher dimensions and social satire.',
  },
  {
    id: 'how-to-live-on-24-hours', gutenbergId: 2274, expectTitle: '24 Hours',
    title: 'How to Live on 24 Hours a Day', author: 'Arnold Bennett', publishedYear: '1908',
    topics: ['self-development', 'productivity', 'habits'],
    description: 'A short, practical classic on reclaiming the hours outside work for learning and a fuller life.',
  },
  {
    id: 'elements-of-style', gutenbergId: 37134, expectTitle: 'Elements of Style',
    title: 'The Elements of Style', author: 'William Strunk Jr.', publishedYear: '1918',
    topics: ['creative-writing', 'communication', 'languages'],
    description: 'The original, compact rulebook for clear English writing.',
  },
  {
    id: 'talks-to-teachers', gutenbergId: 16287, expectTitle: 'Talks to Teachers',
    title: 'Talks to Teachers on Psychology', author: 'William James', publishedYear: '1899',
    topics: ['psychology', 'education', 'learning-how-to-learn'],
    description: 'The founder of American psychology on attention, habit, memory and interest — and how to use them when learning.',
  },
  {
    id: 'discourse-on-method', gutenbergId: 59, expectTitle: 'Discourse on the Method',
    title: 'Discourse on the Method', author: 'René Descartes (trans. John Veitch)', publishedYear: '1637',
    topics: ['philosophy', 'philosophy-of-science', 'logic'],
    description: 'Descartes explains the method of doubt and four rules for thinking clearly — the start of modern philosophy.',
  },
  {
    id: 'pride-and-prejudice', gutenbergId: 1342, expectTitle: 'Pride and Prejudice',
    title: 'Pride and Prejudice', author: 'Jane Austen', publishedYear: '1813',
    topics: ['literature'],
    description: 'Elizabeth Bennet, Mr Darcy and the art of first impressions — a sharp comedy about class, money and judging too quickly.',
  },
  {
    id: 'frankenstein', gutenbergId: 84, expectTitle: 'Frankenstein',
    title: 'Frankenstein; or, The Modern Prometheus', author: 'Mary Shelley', publishedYear: '1818',
    topics: ['literature', 'science', 'ethics'],
    description: 'A young scientist creates life and abandons it — the founding novel of science fiction and a lasting question about responsibility.',
  },
  {
    id: 'franklin-autobiography', gutenbergId: 20203, expectTitle: 'Autobiography',
    title: 'The Autobiography of Benjamin Franklin', author: 'Benjamin Franklin', publishedYear: '1791',
    topics: ['history', 'self-development', 'habits'],
    description: 'Printer, scientist and diplomat on self-education — including his famous plan for practising thirteen virtues, one week at a time.',
  },
  {
    id: 'communist-manifesto', gutenbergId: 61, expectTitle: 'Communist Manifesto',
    title: 'The Communist Manifesto', author: 'Karl Marx & Friedrich Engels (trans. Samuel Moore)', publishedYear: '1848',
    topics: ['politics', 'economics', 'history'],
    description: 'The short pamphlet that shaped a century of politics, read here in the 1888 English translation.',
  },
  {
    id: 'walden', gutenbergId: 205, expectTitle: 'Walden',
    title: 'Walden', author: 'Henry David Thoreau', publishedYear: '1854',
    topics: ['philosophy', 'ecology', 'self-development'],
    description: 'Two years in a cabin by a pond: an experiment in living simply, deliberately and close to nature.',
  },
  {
    id: 'beyond-good-and-evil', gutenbergId: 4363, expectTitle: 'Beyond Good and Evil',
    title: 'Beyond Good and Evil', author: 'Friedrich Nietzsche (trans. Helen Zimmern)', publishedYear: '1886',
    topics: ['philosophy', 'ethics'],
    description: 'Nietzsche questions the assumptions behind morality and philosophy itself.',
  },
  {
    id: 'common-sense', gutenbergId: 147, expectTitle: 'Common Sense',
    title: 'Common Sense', author: 'Thomas Paine', publishedYear: '1776',
    topics: ['politics', 'history'],
    description: 'The plain-spoken pamphlet that argued the American colonies should govern themselves.',
  },
  {
    id: 'on-liberty', gutenbergId: 34901, expectTitle: 'On Liberty',
    title: 'On Liberty', author: 'John Stuart Mill', publishedYear: '1859',
    topics: ['philosophy', 'politics', 'ethics'],
    description: 'Where should society’s power over the individual stop? Mill’s classic case for free thought and expression.',
  },
  {
    id: 'alice-in-wonderland', gutenbergId: 11, expectTitle: 'Alice',
    title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', publishedYear: '1865',
    topics: ['literature', 'logic'],
    description: 'A mathematician’s playful fantasy, full of logic puzzles and wordplay.',
  },
  {
    id: 'time-machine', gutenbergId: 35, expectTitle: 'Time Machine',
    title: 'The Time Machine', author: 'H. G. Wells', publishedYear: '1895',
    topics: ['literature', 'physics', 'sociology'],
    description: 'A Victorian inventor travels to the year 802,701 and finds where society has taken humanity.',
  },
  {
    id: 'tao-te-ching', gutenbergId: 216, expectTitle: 'Tao',
    title: 'Tao Te Ching', author: 'Laozi (trans. James Legge)', publishedYear: 'c. 400 BC',
    topics: ['philosophy'],
    description: 'Eighty-one short chapters on simplicity, balance and leading without force.',
  },
  {
    id: 'wealth-of-nations', gutenbergId: 3300, expectTitle: 'Wealth of Nations',
    title: 'The Wealth of Nations', author: 'Adam Smith', publishedYear: '1776',
    topics: ['economics', 'business', 'history'],
    description: 'The founding text of economics: the division of labour, markets, trade and what makes nations prosper.',
  },
];

export interface TrackOnlyBookSeed {
  id: string;
  title: string;
  author: string;
  publishedYear: string;
  topics: string[];
  description: string;
}

/** Books people can add to their lists and quote from, but which aren't readable in the app. */
/** Open-access papers (CC BY) copied from Europe PMC into our library at seed time. */
export const OPEN_PAPERS: string[] = ['PMC13280723', 'PMC13230953', 'PMC13038847'];

/** Encyclopaedia articles (CC BY-SA) copied from Wikipedia, with attribution shown in the reader. */
export const WIKIPEDIA_ARTICLES: Array<{ lang: 'en' | 'es' | 'fr'; title: string }> = [
  { lang: 'en', title: 'Spaced repetition' },
  { lang: 'en', title: 'Photosynthesis' },
];

export const TRACK_ONLY_BOOKS: TrackOnlyBookSeed[] = [
  { id: 'book1', title: 'The Quantum Universe', author: 'Brian Cox & Jeff Forshaw', publishedYear: '2011', topics: ['physics', 'quantum-mechanics', 'cosmology'], description: 'A captivating journey into the weird and wonderful world of quantum mechanics, making complex ideas accessible.' },
  { id: 'book2', title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', publishedYear: '2014', topics: ['history', 'anthropology'], description: "A groundbreaking narrative of humanity's creation and evolution." },
  { id: 'book3', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', publishedYear: '2011', topics: ['psychology', 'self-development'], description: 'Kahneman, a Nobel laureate in economics, explains the two systems that drive the way we think.' },
  { id: 'book4', title: 'Atomic Habits', author: 'James Clear', publishedYear: '2018', topics: ['self-development', 'habits', 'psychology'], description: 'An easy and proven way to build good habits and break bad ones.' },
  { id: 'book5', title: 'The Lean Startup', author: 'Eric Ries', publishedYear: '2011', topics: ['business', 'entrepreneurship'], description: "How today's entrepreneurs use continuous innovation to create radically successful businesses." },
  { id: 'book7', title: 'Cosmos', author: 'Carl Sagan', publishedYear: '1980', topics: ['physics', 'cosmology', 'astronomy'], description: 'One of the bestselling science books of all time, Cosmos retraces the 14 billion years of cosmic evolution.' },
  { id: 'book8', title: '1984', author: 'George Orwell', publishedYear: '1949', topics: ['literature', 'politics'], description: 'A dystopian novel set in Airstrip One, a province of the superstate Oceania in a world of perpetual war.' },
  { id: 'book9', title: 'A Brief History of Time', author: 'Stephen Hawking', publishedYear: '1988', topics: ['physics', 'cosmology'], description: 'A landmark volume in science writing by one of the great minds of our time.' },
  { id: 'book10', title: 'The Elegant Universe', author: 'Brian Greene', publishedYear: '1999', topics: ['physics'], description: "Brian Greene, one of the world's leading string theorists, peels away layers of mystery to reveal a universe that consists of eleven dimensions." },
  { id: 'book11', title: 'Astrophysics for People in a Hurry', author: 'Neil deGrasse Tyson', publishedYear: '2017', topics: ['physics', 'astrophysics', 'astronomy'], description: 'What is the nature of space and time? How do we fit within the universe? A quick, mind-expanding tour.' },
  { id: 'book12', title: 'The Fabric of the Cosmos', author: 'Brian Greene', publishedYear: '2004', topics: ['physics', 'cosmology'], description: 'Explores the nature of space, time, and reality, covering topics such as string theory, quantum mechanics, and cosmology.' },
  { id: 'book13', title: 'Guns, Germs, and Steel', author: 'Jared Diamond', publishedYear: '1997', topics: ['history', 'anthropology', 'sociology'], description: 'Diamond explores how and why human societies followed different paths of development over the past 13,000 years.' },
  { id: 'book14', title: 'The Selfish Gene', author: 'Richard Dawkins', publishedYear: '1976', topics: ['biology', 'genetics'], description: 'A classic work on evolutionary biology, popularising the gene-centred view of evolution.' },
  { id: 'book15', title: 'Pale Blue Dot', author: 'Carl Sagan', publishedYear: '1994', topics: ['astronomy', 'cosmology', 'philosophy'], description: "Sagan's vision of humanity's future in space, inspired by the famous Voyager 1 photograph of Earth." },
  { id: 'book16', title: 'Black Holes and Time Warps', author: 'Kip S. Thorne', publishedYear: '1994', topics: ['physics', 'astrophysics'], description: "A comprehensive exploration of black holes, wormholes, and time travel, grounded in Einstein's theory of general relativity." },
  { id: 'book17', title: 'The Code Book', author: 'Simon Singh', publishedYear: '1999', topics: ['technology', 'history', 'cryptography'], description: 'The history of codes and code-breaking from ancient Egypt to the Internet age.' },
  { id: 'book18', title: 'The Structure of Scientific Revolutions', author: 'Thomas S. Kuhn', publishedYear: '1962', topics: ['philosophy-of-science', 'history', 'science'], description: 'An influential book on the history and philosophy of science, introducing the concept of "paradigm shifts".' },
  { id: 'book19', title: 'Gödel, Escher, Bach: An Eternal Golden Braid', author: 'Douglas Hofstadter', publishedYear: '1979', topics: ['mathematics', 'philosophy', 'arts-culture'], description: 'Explores common themes in the lives and works of logician Kurt Gödel, artist M.C. Escher, and composer Johann Sebastian Bach.' },
];

// ---------------- demo data: ONLY written to the local emulator ----------------

export interface DemoUser {
  key: string;
  email: string;
  displayName: string;
  handle: string;
  bio: string;
  interests: string[];
}

/** Emulator-only accounts. They share DEMO_PASSWORD (see scripts/seed.ts) and never exist in production. */
export const DEMO_USERS: DemoUser[] = [
  { key: 'alice', email: 'alice@demo.knowledgeable.test', displayName: 'Alice Wonderland', handle: 'alice', bio: 'Avid reader and researcher. Exploring the depths of knowledge.', interests: ['physics', 'philosophy', 'history', 'psychology'] },
  { key: 'bob', email: 'bob@demo.knowledgeable.test', displayName: 'Bob The Builder', handle: 'bob_builds', bio: 'Loves to learn and share insights. Always curious.', interests: ['technology', 'self-development', 'business', 'education'] },
  { key: 'charlie', email: 'charlie@demo.knowledgeable.test', displayName: 'Charlie Brown', handle: 'charlie', bio: 'Exploring philosophy and the human condition.', interests: ['philosophy', 'literature', 'astronomy'] },
];

export interface DemoPost {
  author: DemoUser['key'];
  type: 'idea' | 'summary' | 'questions' | 'opinion' | 'article' | 'research' | 'poll';
  title: string;
  body: string;
  topics: string[];
  source?: { kind: 'book'; id: string; title: string };
  authors?: string[];
  poll?: { question: string; options: string[]; counts?: number[] };
  hoursAgo: number;
}

export const DEMO_POSTS: DemoPost[] = [
  // Deepstash-style ideas from the readable books.
  { author: 'charlie', type: 'idea', title: 'Sort everything into “up to me” and “not up to me”', body: 'Before reacting to a problem, ask which part is actually in your control — your judgements and actions — and which is not. Spend energy only on the first list; treat the second calmly. It is less about suppressing feelings and more about aiming effort where it can work.', topics: ['stoicism', 'self-development'], source: { kind: 'book', id: 'meditations', title: 'Meditations' }, hoursAgo: 3 },
  { author: 'bob', type: 'idea', title: 'Your learning day starts when your work day ends', body: 'Bennett argues the hours outside work are not leftovers but the part of the day that is truly yours. His suggestion: protect about ninety minutes on three evenings a week for deliberate study, and treat that time as seriously as a meeting.', topics: ['productivity', 'habits'], source: { kind: 'book', id: 'how-to-live-on-24-hours', title: 'How to Live on 24 Hours a Day' }, hoursAgo: 5 },
  { author: 'alice', type: 'idea', title: 'Small differences + a long time = big change', body: 'Natural selection needs only three things: variation between individuals, some of that variation being inherited, and some variants leaving more offspring. Repeat over many generations and tiny advantages add up to new forms. The same logic explains why small daily improvements compound.', topics: ['biology', 'science'], source: { kind: 'book', id: 'origin-of-species', title: 'On the Origin of Species' }, hoursAgo: 8 },
  { author: 'bob', type: 'idea', title: 'Omit needless words', body: 'A sentence should contain no unnecessary words, for the same reason a drawing should have no unnecessary lines. This does not mean writing only short sentences — it means every word should do work.', topics: ['creative-writing', 'communication'], source: { kind: 'book', id: 'elements-of-style', title: 'The Elements of Style' }, hoursAgo: 12 },
  { author: 'alice', type: 'idea', title: 'You only ever see a slice of a higher dimension', body: 'When a sphere passes through a two-dimensional world, its inhabitants see a dot that grows into a circle and shrinks again. We are in the same position with ideas beyond our experience: we see cross-sections and must reason about the whole.', topics: ['geometry', 'mathematics'], source: { kind: 'book', id: 'flatland', title: 'Flatland: A Romance of Many Dimensions' }, hoursAgo: 20 },
  { author: 'charlie', type: 'idea', title: 'Make good actions automatic as early as possible', body: 'James describes habit as the enormous flywheel of society: the more everyday actions we hand over to automatic habit, the more attention is freed for real thinking. Start a new habit with a strong, public commitment and never allow an exception until it is rooted.', topics: ['habits', 'psychology', 'learning-how-to-learn'], source: { kind: 'book', id: 'talks-to-teachers', title: 'Talks to Teachers on Psychology' }, hoursAgo: 26 },
  { author: 'alice', type: 'idea', title: 'Four rules for thinking clearly', body: '1) Accept nothing as true that you do not clearly know to be true. 2) Divide each difficulty into as many parts as needed. 3) Work from the simplest to the most complex. 4) Review so completely that nothing is left out.', topics: ['logic', 'philosophy-of-science'], source: { kind: 'book', id: 'discourse-on-method', title: 'Discourse on the Method' }, hoursAgo: 30 },
  { author: 'charlie', type: 'idea', title: 'The cave: mistaking shadows for reality', body: 'Prisoners who have only ever seen shadows on a wall take the shadows to be the real world. Education, for Plato, is not filling an empty mind but turning the whole person around to face what is real — which is uncomfortable at first.', topics: ['philosophy', 'education'], source: { kind: 'book', id: 'the-republic', title: 'The Republic' }, hoursAgo: 40 },

  // The community posts from the original prototype.
  { author: 'alice', type: 'summary', title: 'My Summary of The Quantum Universe Ch. 1', body: 'Chapter 1 introduces the fundamental concepts of quantum mechanics... this is my take.', topics: ['physics', 'quantum-mechanics'], source: { kind: 'book', id: 'book1', title: 'The Quantum Universe' }, hoursAgo: 2 },
  { author: 'alice', type: 'questions', title: 'Discussion Questions for Sapiens', body: '1. How did Sapiens come to dominate the world?\n2. What is the role of fiction in human society?\n3. Are we happier than our ancestors?', topics: ['history', 'anthropology'], source: { kind: 'book', id: 'book2', title: 'Sapiens: A Brief History of Humankind' }, hoursAgo: 14 },
  { author: 'bob', type: 'article', title: 'The Future of AI in Education: A Review', body: 'AI is poised to revolutionise how we learn and teach. This review looks at current trends — personalised practice, instant feedback, and AI tutors — and at the risks, from over-reliance to unequal access.', topics: ['ai', 'education'], authors: ['Bob The Builder'], hoursAgo: 22 },
  { author: 'bob', type: 'summary', title: 'My Key Takeaways from Atomic Habits', body: 'Small habits make a big difference. Focus on systems, not goals. My personal thoughts on how this applies to learning complex subjects.', topics: ['habits', 'self-development'], source: { kind: 'book', id: 'book4', title: 'Atomic Habits' }, hoursAgo: 24 },
  { author: 'alice', type: 'research', title: 'The Impact of Social Media on Young Adults: A Meta-Analysis', body: 'Recent studies show a correlation between heavy social media use and increased anxiety. This meta-analysis reviews 50 papers on the topic, highlighting common methodologies and discrepancies in findings.', topics: ['psychology', 'technology'], authors: ['Alice Wonderland', 'Research Group'], hoursAgo: 48 },
  { author: 'charlie', type: 'opinion', title: 'Why Stoicism Still Matters Today', body: 'Stoic principles offer valuable guidance for navigating modern challenges. The emphasis on what we can control versus what we cannot is particularly relevant in our chaotic world. Here is my perspective.', topics: ['stoicism', 'philosophy'], source: { kind: 'book', id: 'meditations', title: 'Meditations' }, hoursAgo: 72 },
  { author: 'alice', type: 'opinion', title: 'The Vastness of the Universe is Humbling', body: 'Thinking about the scale of the universe really puts human concerns into perspective. Carl Sagan had such a gift for conveying this wonder.', topics: ['cosmology', 'astronomy'], source: { kind: 'book', id: 'book7', title: 'Cosmos' }, hoursAgo: 80 },
  { author: 'bob', type: 'opinion', title: 'Are We Alone in the Universe?', body: 'The Fermi Paradox is fascinating. With so many stars and planets, where is everyone? My thoughts on the possibilities for extraterrestrial life, considering the Great Filter theory.', topics: ['astrophysics', 'astronomy'], hoursAgo: 90 },
  { author: 'charlie', type: 'opinion', title: 'The Ethics of Artificial General Intelligence', body: 'As AI capabilities grow, we need to seriously consider the ethical implications of AGI. What safeguards should be in place, and who decides?', topics: ['ai', 'ethics'], hoursAgo: 100 },
  { author: 'alice', type: 'opinion', title: 'Lessons from the Fall of Rome', body: "There are many parallels between the Roman Empire's decline and contemporary societal challenges, particularly concerning economic inequality and overextension.", topics: ['history'], hoursAgo: 110 },
  { author: 'bob', type: 'opinion', title: 'Why Reading Fiction is Important', body: "Fiction isn't just escapism; it builds empathy and understanding. It allows us to explore diverse human experiences safely.", topics: ['literature'], hoursAgo: 120 },
  { author: 'alice', type: 'poll', title: 'Favourite Sci-Fi Concept?', body: '', topics: ['technology', 'literature'], poll: { question: 'What is your favourite science fiction concept explored in books/movies?', options: ['Faster-Than-Light Travel', 'Artificial General Intelligence', 'Time Travel', 'Parallel Universes'], counts: [25, 40, 15, 20] }, hoursAgo: 130 },
  { author: 'bob', type: 'poll', title: 'Best Language for Beginners?', body: '', topics: ['software-dev', 'education'], poll: { question: 'Which programming language is best for beginners?', options: ['Python', 'JavaScript', 'Java', 'C#'], counts: [55, 30, 8, 7] }, hoursAgo: 140 },
  { author: 'charlie', type: 'poll', title: 'Preferred Learning Method?', body: '', topics: ['education', 'learning-how-to-learn'], poll: { question: "What's your preferred way to learn new topics?", options: ['Books', 'Online Courses', 'Documentaries', 'Hands-on Projects'] }, hoursAgo: 150 },
];
