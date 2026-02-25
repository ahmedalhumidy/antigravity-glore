import { useState, useEffect, useCallback } from 'react';
import { Search, Bookmark, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SearchPreset {
    id: string;
    name: string;
    query: string;
    category?: string | null;
    sortField?: string;
    sortOrder?: string;
    createdAt: number;
}

const PRESETS_KEY = 'deluxxs_search_presets';

function loadPresets(): SearchPreset[] {
    try {
        const raw = localStorage.getItem(PRESETS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function savePresets(presets: SearchPreset[]) {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

interface SavedSearchPresetsProps {
    currentQuery: string;
    currentCategory?: string | null;
    currentSortField?: string;
    currentSortOrder?: string;
    onApplyPreset: (preset: SearchPreset) => void;
    className?: string;
}

export function SavedSearchPresets({
    currentQuery,
    currentCategory,
    currentSortField,
    currentSortOrder,
    onApplyPreset,
    className,
}: SavedSearchPresetsProps) {
    const [presets, setPresets] = useState<SearchPreset[]>(loadPresets);
    const [showSave, setShowSave] = useState(false);
    const [presetName, setPresetName] = useState('');

    useEffect(() => {
        savePresets(presets);
    }, [presets]);

    const handleSave = useCallback(() => {
        if (!presetName.trim()) return;
        const newPreset: SearchPreset = {
            id: Date.now().toString(36),
            name: presetName.trim(),
            query: currentQuery,
            category: currentCategory,
            sortField: currentSortField,
            sortOrder: currentSortOrder,
            createdAt: Date.now(),
        };
        setPresets(prev => [...prev, newPreset]);
        setPresetName('');
        setShowSave(false);
        toast.success('Arama kayıt edildi');
    }, [presetName, currentQuery, currentCategory, currentSortField, currentSortOrder]);

    const handleDelete = (id: string) => {
        setPresets(prev => prev.filter(p => p.id !== id));
    };

    const canSave = currentQuery || currentCategory;

    return (
        <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
            {/* Saved presets */}
            {presets.map((preset) => (
                <button
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                    <Bookmark className="w-3 h-3" />
                    {preset.name}
                    <span
                        onClick={(e) => { e.stopPropagation(); handleDelete(preset.id); }}
                        className="hidden group-hover:inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors ml-0.5"
                    >
                        <X className="w-2.5 h-2.5" />
                    </span>
                </button>
            ))}

            {/* Save current search button */}
            {canSave && !showSave && (
                <button
                    onClick={() => setShowSave(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Kaydet
                </button>
            )}

            {/* Save input */}
            {showSave && (
                <div className="inline-flex items-center gap-1">
                    <Input
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        placeholder="Preset adı..."
                        className="h-7 w-28 text-xs"
                        autoFocus
                    />
                    <button
                        onClick={handleSave}
                        disabled={!presetName.trim()}
                        className="p-1 rounded hover:bg-success/10 text-success transition-colors"
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => { setShowSave(false); setPresetName(''); }}
                        className="p-1 rounded hover:bg-muted transition-colors"
                    >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                </div>
            )}
        </div>
    );
}
