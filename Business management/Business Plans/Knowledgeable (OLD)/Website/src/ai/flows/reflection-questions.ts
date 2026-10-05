'use server';

/**
 * @fileOverview Suggests open reflection questions about a work the reader has finished.
 * There are no right answers — the questions help the reader put what they learned into words.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {guardedAI, type AIResult} from '@/ai/guard';

const ReflectionQuestionsInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().max(200).optional(),
  kind: z.enum(['book', 'paper', 'article']),
  language: z.enum(['en-GB', 'es', 'fr']).optional(),
});
export type ReflectionQuestionsInput = z.infer<typeof ReflectionQuestionsInputSchema>;

const ReflectionQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('Four open reflection questions.'),
});
export type ReflectionQuestionsOutput = z.infer<typeof ReflectionQuestionsOutputSchema>;

const LANGUAGE_NAMES = {'en-GB': 'British English', es: 'Spanish', fr: 'French'} as const;

const PromptSchema = z.object({
  title: z.string(),
  author: z.string(),
  kind: z.string(),
  languageName: z.string(),
});

const prompt = ai.definePrompt({
  name: 'reflectionQuestionsPrompt',
  input: {schema: PromptSchema},
  output: {schema: ReflectionQuestionsOutputSchema},
  prompt: `A reader has just finished the {{{kind}}} "{{{title}}}"{{#if author}} by {{{author}}}{{/if}}.
Write exactly four short, open reflection questions about its specific content that help them recall and
think about what they learned. There are no right or wrong answers: avoid trivia and yes/no questions,
and do not reveal answers. Write the questions in {{{languageName}}}.`,
});

const reflectionQuestionsFlow = ai.defineFlow(
  {name: 'reflectionQuestionsFlow', inputSchema: ReflectionQuestionsInputSchema, outputSchema: ReflectionQuestionsOutputSchema},
  async input => {
    const {output} = await prompt({
      title: input.title,
      author: input.author ?? '',
      kind: input.kind,
      languageName: LANGUAGE_NAMES[input.language ?? 'en-GB'],
    });
    return {questions: (output?.questions ?? []).map(q => q.trim()).filter(Boolean).slice(0, 4)};
  }
);

export async function suggestReflectionQuestions(input: ReflectionQuestionsInput): Promise<AIResult<ReflectionQuestionsOutput>> {
  return guardedAI(ReflectionQuestionsInputSchema, input, valid => reflectionQuestionsFlow(valid));
}
