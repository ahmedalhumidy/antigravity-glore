import { useEffect, useState, useCallback } from 'react';
import { X, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutGroup {
    title: string;
    shortcuts: { keys: string[]; label: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
    {
        title: 'Genel',
        shortcuts: [
            { keys: ['?'], label: 'Bu paneli aç/kapat' },
            { keys: ['Ctrl', 'K'], label: 'Arama çubuğuna odaklan' },
            { keys: ['Esc'], label: 'Açık paneli / arama kutusunu kapat' },
        ],
    },
    {
        title: 'Navigasyon',
        shortcuts: [
            { keys: ['G', 'D'], label: 'Kontrol Paneli' },
            { keys: ['G', 'P'], label: 'Ürünler' },
            { keys: ['G', 'M'], label: 'Stok Hareketleri' },
            { keys: ['G', 'R'], label: 'Raporlar' },
            { keys: ['G', 'S'], label: 'Ayarlar' },
        ],
    },
    {
        title: 'İşlemler',
        shortcuts: [
            { keys: ['N'], label: 'Yeni ürün ekle' },
            { keys: ['S'], label: 'Barkod tara' },
            { keys: ['T'], label: 'Raf transferi' },
        ],
    },
];

export function KeyboardShortcutsOverlay() {
    const [isOpen, setIsOpen] = useState(false);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        if (e.key === '?') {
            e.preventDefault();
            setIsOpen(prev => !prev);
        }
        if (e.key === 'Escape' && isOpen) {
            setIsOpen(false);
        }
    }, [isOpen]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="pointer-events-auto w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-slide-up overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                                <Command className="w-4 h-4 text-primary" />
                            </div>
                            <h2 className="text-base font-semibold text-foreground">Klavye Kısayolları</h2>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-5">
                        {shortcutGroups.map((group) => (
                            <div key={group.title}>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                                    {group.title}
                                </h3>
                                <div className="space-y-1.5">
                                    {group.shortcuts.map((shortcut, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <span className="text-sm text-foreground">{shortcut.label}</span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, ki) => (
                                                    <span key={ki}>
                                                        <kbd className={cn(
                                                            'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5',
                                                            'rounded-md border border-border bg-muted/80',
                                                            'text-[11px] font-mono font-medium text-muted-foreground',
                                                            'shadow-sm'
                                                        )}>
                                                            {key}
                                                        </kbd>
                                                        {ki < shortcut.keys.length - 1 && (
                                                            <span className="text-muted-foreground/50 text-xs mx-0.5">+</span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-border bg-muted/30">
                        <p className="text-[11px] text-muted-foreground text-center">
                            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-border bg-muted text-[10px] font-mono font-medium shadow-sm">?</kbd>
                            <span className="ml-1.5">tuşuna basarak bu paneli açıp kapatabilirsiniz</span>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
