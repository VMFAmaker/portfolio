import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import { rateLimit } from '@/lib/server/rate-limit';
import { msg } from '@/lib/i18n/core';

export type AIResult<T> = { ok: true; data: T } | { ok: false; error: string };

const AI_CALLS_PER_WINDOW = 20;
const AI_WINDOW_MS = 10 * 60 * 1000;

/**
 * Every exported function in a 'use server' file is a public HTTP endpoint, so each AI action
 * runs through this guard: signed-in session required, input validated and size-capped,
 * per-user rate limit, and errors returned as friendly messages (never stack traces).
 */
export async function guardedAI<S extends ZodTypeAny, T>(
  schema: S,
  input: unknown,
  run: (input: ZodInfer<S>) => Promise<T>
): Promise<AIResult<T>> {
  // Imported lazily so the Genkit dev UI (which loads these flows outside Next.js) still starts.
  const { getSessionUser } = await import('@/lib/auth/session');
  const user = await getSessionUser();
  if (!user) return { ok: false, error: msg('Please sign in to use the AI helpers.') };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: msg('That text is too long or empty for the AI helper.') };

  if (!rateLimit(`ai:${user.uid}`, AI_CALLS_PER_WINDOW, AI_WINDOW_MS)) {
    return { ok: false, error: msg("You've used the AI helpers a lot recently. Try again in a few minutes.") };
  }

  try {
    return { ok: true, data: await run(parsed.data) };
  } catch (error) {
    console.error('AI request failed', { uid: user.uid, error });
    return { ok: false, error: msg('The AI helper is unavailable right now. Please try again later.') };
  }
}
