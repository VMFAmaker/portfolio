"use client";

import { useState, type FormEvent } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface SearchInputProps {
  className?: string;
}

export function SearchInput({ className }: SearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { t } = useI18n();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex w-full max-w-sm items-center space-x-2 ${className}`}>
      <Input
        type="search"
        placeholder={t('Search books, papers, people…')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-9"
      />
      <Button type="submit" variant="ghost" size="icon" aria-label={t('Search')}>
        <Search className="h-5 w-5" />
      </Button>
    </form>
  );
}
