
'use server';
/**
 * @fileOverview An AI agent that explains a subject or topic.
 *
 * - explainSubject - A function that provides an explanation and related suggestions for a subject.
 * - ExplainSubjectInput - The input type for the explainSubject function.
 * - AISubjectExplanation - The return type for the explainSubject function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {guardedAI, type AIResult} from '@/ai/guard';

const ExplainSubjectInputSchema = z.object({
  searchQuery: z.string().trim().min(1).max(200).describe('The subject or topic to be explained.'),
  language: z.enum(['en-GB', 'es', 'fr']).optional().describe('Interface language to answer in.'),
});

const LANGUAGE_NAMES = { 'en-GB': 'British English', es: 'Spanish', fr: 'French' } as const;

// What the prompt actually receives: the language is spelled out for the model.
const ExplainSubjectPromptSchema = z.object({
  searchQuery: z.string(),
  languageName: z.string(),
});
export type ExplainSubjectInput = z.infer<typeof ExplainSubjectInputSchema>;

// Removed export from the Zod schema. The type AISubjectExplanation below is exported instead.
const AISubjectExplanationSchema = z.object({
  explanation: z
    .string()
    .describe('A concise explanation of the subject or topic.'),
  aiSuggestedBooks: z
    .array(
      z.object({
        title: z.string(),
        author: z.string().optional(),
      })
    )
    .describe(
      'A list of up to 3 AI-suggested book titles that would be relevant. Keep titles short and focused.'
    )
    .optional(),
  aiSuggestedSources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().optional(), // Removed .url() validation here
      })
    )
    .describe(
      'A list of up to 3 AI-suggested online articles or sources/papers that would be relevant. Keep titles short.'
    )
    .optional(),
});
export type AISubjectExplanation = z.infer<typeof AISubjectExplanationSchema>;

export async function explainSubject(
  input: ExplainSubjectInput
): Promise<AIResult<AISubjectExplanation>> {
  return guardedAI(ExplainSubjectInputSchema, input, (valid) => explainSubjectFlow(valid));
}

const prompt = ai.definePrompt({
  name: 'explainSubjectPrompt',
  input: {schema: ExplainSubjectPromptSchema},
  output: {schema: AISubjectExplanationSchema},
  prompt: `You are a helpful research assistant.
For the given academic subject or topic: "{{{searchQuery}}}", provide (writing the explanation and all titles you describe in {{{languageName}}}, but keeping real book and article titles as published):
1. A concise explanation of the subject/topic (explanation field).
2. A list of up to 3 AI-suggested book titles that would be relevant (aiSuggestedBooks field, authors are optional).
3. A list of up to 3 AI-suggested online articles or sources/papers that would be relevant (aiSuggestedSources field, URLs are optional and should be valid if provided).

Focus on clarity and relevance. Ensure the output strictly adheres to the Zod schema provided for AISubjectExplanationSchema.
The 'explanation' should be a single string.
'aiSuggestedBooks' should be an array of objects, each with 'title' and optional 'author'.
'aiSuggestedSources' should be an array of objects, each with 'title' and optional 'url'.
If you cannot find relevant books or sources, you can return empty arrays for those fields or omit them if the schema allows.
Example for a book: { "title": "A Brief History of Time", "author": "Stephen Hawking" }
Example for a source: { "title": "NASA's Exoplanet Discoveries", "url": "https://www.nasa.gov/exoplanets" }
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  },
});

const explainSubjectFlow = ai.defineFlow(
  {
    name: 'explainSubjectFlow',
    inputSchema: ExplainSubjectInputSchema,
    outputSchema: AISubjectExplanationSchema,
  },
  async input => {
    const {output} = await prompt({searchQuery: input.searchQuery, languageName: LANGUAGE_NAMES[input.language ?? 'en-GB']});
    // Ensure output is not null, and if fields are missing and optional, they remain undefined.
    // The prompt is guided to return empty arrays if it can't find suggestions.
    return output || { explanation: "Could not retrieve explanation at this time.", aiSuggestedBooks: [], aiSuggestedSources: [] };
  }
);

