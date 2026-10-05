'use server';

/**
 * @fileOverview Summarizes a document or book using AI.
 *
 * - summarizeDocument - A function that handles the document summarization process.
 * - SummarizeDocumentInput - The input type for the summarizeDocument function.
 * - SummarizeDocumentOutput - The return type for the summarizeDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {guardedAI, type AIResult} from '@/ai/guard';

const SummarizeDocumentInputSchema = z.object({
  documentContent: z
    .string()
    .trim()
    .min(1)
    .max(30000)
    .describe('The content of the document or book to be summarized.'),
});
export type SummarizeDocumentInput = z.infer<typeof SummarizeDocumentInputSchema>;

const SummarizeDocumentOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the provided document or book content.'),
});
export type SummarizeDocumentOutput = z.infer<typeof SummarizeDocumentOutputSchema>;

export async function summarizeDocument(input: SummarizeDocumentInput): Promise<AIResult<SummarizeDocumentOutput>> {
  return guardedAI(SummarizeDocumentInputSchema, input, (valid) => summarizeDocumentFlow(valid));
}

const summarizeDocumentPrompt = ai.definePrompt({
  name: 'summarizeDocumentPrompt',
  input: {schema: SummarizeDocumentInputSchema},
  output: {schema: SummarizeDocumentOutputSchema},
  prompt: `Summarize the following document or book content:

{{{documentContent}}}`, 
});

const summarizeDocumentFlow = ai.defineFlow(
  {
    name: 'summarizeDocumentFlow',
    inputSchema: SummarizeDocumentInputSchema,
    outputSchema: SummarizeDocumentOutputSchema,
  },
  async input => {
    const {output} = await summarizeDocumentPrompt(input);
    return output!;
  }
);
