'use server';

/**
 * @fileOverview Generates discussion questions from a given text.
 *
 * - generateDiscussionQuestions - A function that generates discussion questions.
 * - GenerateDiscussionQuestionsInput - The input type for the generateDiscussionQuestions function.
 * - GenerateDiscussionQuestionsOutput - The return type for the generateDiscussionQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {guardedAI, type AIResult} from '@/ai/guard';

const GenerateDiscussionQuestionsInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1)
    .max(30000)
    .describe(
      'The text (book summary or specific chapters/pages) from which to generate discussion questions.'
    ),
});
export type GenerateDiscussionQuestionsInput = z.infer<
  typeof GenerateDiscussionQuestionsInputSchema
>;

const GenerateDiscussionQuestionsOutputSchema = z.object({
  questions: z
    .array(z.string())
    .describe('An array of discussion questions generated from the text.'),
});
export type GenerateDiscussionQuestionsOutput = z.infer<
  typeof GenerateDiscussionQuestionsOutputSchema
>;

export async function generateDiscussionQuestions(
  input: GenerateDiscussionQuestionsInput
): Promise<AIResult<GenerateDiscussionQuestionsOutput>> {
  return guardedAI(GenerateDiscussionQuestionsInputSchema, input, (valid) => generateDiscussionQuestionsFlow(valid));
}

const prompt = ai.definePrompt({
  name: 'generateDiscussionQuestionsPrompt',
  input: {schema: GenerateDiscussionQuestionsInputSchema},
  output: {schema: GenerateDiscussionQuestionsOutputSchema},
  prompt: `You are an expert facilitator of book discussions. Your task is to generate insightful and engaging discussion questions based on the provided text. The questions should encourage deep thinking and exploration of the material.

Text: {{{text}}}

Discussion Questions (in array format):`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const generateDiscussionQuestionsFlow = ai.defineFlow(
  {
    name: 'generateDiscussionQuestionsFlow',
    inputSchema: GenerateDiscussionQuestionsInputSchema,
    outputSchema: GenerateDiscussionQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
