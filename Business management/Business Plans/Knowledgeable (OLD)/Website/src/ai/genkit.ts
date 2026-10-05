import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Google retires Gemini model versions regularly (gemini-2.0-flash now returns 404), so the
// model is configurable: set GEMINI_MODEL in the environment to switch without a code change.
const model = `googleai/${process.env.GEMINI_MODEL ?? 'gemini-3.8-flash'}`;

export const ai = genkit({
  plugins: [googleAI()],
  model,
});
