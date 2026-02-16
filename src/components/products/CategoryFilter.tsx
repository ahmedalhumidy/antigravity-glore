import { useMemo } from 'react';
import { Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Elektronik': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'Aksesuar': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  'Yedek Parça': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  'Giyim': 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  'Gıda': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
};

function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  // Generate consistent color from category name
  const hash = category.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colors = [
    'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
    'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
    'bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-500/20',
  ];
  return colors[hash % colors.length];
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex items-center gap-1.5 pb-2">
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
            selectedCategory === null
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
          )}
        >
          Tümü
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => onSelectCategory(selectedCategory === cat ? null : cat)}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap',
              selectedCategory === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : getCategoryColor(cat)
            )}
          >
            <Tag className="w-3 h-3" />
            {cat}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

export { getCategoryColor };
