"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/contexts/AuthContext';

/** Reading lists now live on the profile; old links land on the Reading tab. */
export default function ReadingsRedirect() {
  const { profile } = useCurrentUser();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/profile/${profile.id}?tab=reading`);
  }, [profile.id, router]);
  return <Loader2 className="mx-auto mt-24 h-10 w-10 animate-spin text-primary" />;
}
