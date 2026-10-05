import { z } from 'zod';
import { msg } from '@/lib/i18n/core';

/** Client-side password policy. Mirror it in Firebase Console → Authentication → Settings → Password policy. */
export const passwordSchema = z
  .string()
  .min(8, { message: msg('Password must be at least 8 characters.') })
  .max(128, { message: msg('Password must be at most 128 characters.') })
  .regex(/[A-Za-z]/, { message: msg('Include at least one letter.') })
  .regex(/\d/, { message: msg('Include at least one number.') });
