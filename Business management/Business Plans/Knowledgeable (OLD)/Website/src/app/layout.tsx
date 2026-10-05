import type { Metadata } from 'next';
import { Bodoni_Moda } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from "@/components/ui/toaster";

const bodoniModa = Bodoni_Moda({
  variable: '--font-bodoni-moda',
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'Knowledgeable',
  description: 'Learn a little every day — ideas, papers, books and short videos from people who read.',
  // Installable app: iPhone only allows push notifications for apps added to the Home Screen.
  appleWebApp: { capable: true, title: 'Knowledgeable', statusBarStyle: 'default' },
  icons: { apple: '/icons/192.png' },
};

// The app shell (header + sidebar) lives in src/app/(app)/layout.tsx so it only renders for
// signed-in users; the login/signup pages have their own layout.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className={`${bodoniModa.variable} antialiased`}>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
            <Toaster />
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
