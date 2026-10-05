
import Link from 'next/link';

export function AppLogo() {
  return (
    <Link href="/" className="flex items-center text-xl font-bold text-primary hover:text-primary/80 transition-colors">
      <span className="font-bodoni">Knowledgeable</span>
    </Link>
  );
}
