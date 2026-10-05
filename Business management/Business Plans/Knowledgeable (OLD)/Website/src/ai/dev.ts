
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-document.ts';
import '@/ai/flows/generate-discussion-questions.ts';
import '@/ai/flows/explain-subject-flow.ts'; // Added new flow
import '@/ai/flows/reflection-questions.ts';
