import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return (
    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
      <Sun className="w-4 h-4" />
    </Button>
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-lg relative overflow-hidden"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
    >
      <Sun className={`w-4 h-4 transition-all duration-300 absolute ${theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
      <Moon className={`w-4 h-4 transition-all duration-300 absolute ${theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
    </Button>
  );
}
