import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStep {
    target: string; // CSS selector
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
    {
        target: '[data-tour="search"]',
        title: 'Akıllı Arama',
        description: 'Ürün adı, barkod veya raf kodu ile hızlıca arayın. Ctrl+K ile hemen erişin.',
        position: 'bottom',
    },
    {
        target: '[data-tour="dashboard"]',
        title: 'Kontrol Paneli',
        description: 'Stok durumu, hareket grafiği ve akıllı tahminleri tek bakışta görün.',
        position: 'bottom',
    },
    {
        target: '[data-tour="scan"]',
        title: 'Barkod Tarama',
        description: 'Barkod tarayıcı ile ürünleri anında bulun ve stok işlemi yapın.',
        position: 'top',
    },
    {
        target: '[data-tour="quick-actions"]',
        title: 'Hızlı İşlemler',
        description: 'Stok giriş, çıkış, transfer ve daha fazlasına tek tıkla erişin.',
        position: 'bottom',
    },
    {
        target: '[data-tour="theme"]',
        title: 'Tema Değiştirme',
        description: 'Açık ve koyu tema arasında geçiş yapabilirsiniz.',
        position: 'bottom',
    },
];

const TOUR_COMPLETED_KEY = 'deluxxs_tour_completed';

interface OnboardingContextType {
    startTour: () => void;
    isTourActive: boolean;
}

const OnboardingContext = createContext<OnboardingContextType>({
    startTour: () => { },
    isTourActive: false,
});

export function useOnboarding() {
    return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const [currentStep, setCurrentStep] = useState(-1);
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

    const isTourActive = currentStep >= 0;

    const startTour = useCallback(() => {
        setCurrentStep(0);
    }, []);

    // Auto-start on first visit
    useEffect(() => {
        const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
        if (!completed) {
            // Delay to let the app render
            const timer = setTimeout(() => startTour(), 2000);
            return () => clearTimeout(timer);
        }
    }, [startTour]);

    // Position highlight on current step target
    useEffect(() => {
        if (currentStep < 0 || currentStep >= tourSteps.length) {
            setHighlightRect(null);
            return;
        }

        const step = tourSteps[currentStep];
        const el = document.querySelector(step.target);
        if (el) {
            const rect = el.getBoundingClientRect();
            setHighlightRect(rect);
        } else {
            setHighlightRect(null);
        }
    }, [currentStep]);

    const nextStep = () => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            completeTour();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const completeTour = () => {
        setCurrentStep(-1);
        localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    };

    const step = currentStep >= 0 ? tourSteps[currentStep] : null;

    // Calculate tooltip position
    const getTooltipStyle = (): React.CSSProperties => {
        if (!highlightRect || !step) return {};

        const padding = 12;
        const pos = step.position || 'bottom';

        switch (pos) {
            case 'bottom':
                return {
                    top: highlightRect.bottom + padding,
                    left: Math.max(16, Math.min(highlightRect.left, window.innerWidth - 320)),
                };
            case 'top':
                return {
                    bottom: window.innerHeight - highlightRect.top + padding,
                    left: Math.max(16, Math.min(highlightRect.left, window.innerWidth - 320)),
                };
            case 'left':
                return {
                    top: highlightRect.top,
                    right: window.innerWidth - highlightRect.left + padding,
                };
            case 'right':
                return {
                    top: highlightRect.top,
                    left: highlightRect.right + padding,
                };
            default:
                return {};
        }
    };

    return (
        <OnboardingContext.Provider value={{ startTour, isTourActive }}>
            {children}

            {/* Tour overlay */}
            {isTourActive && (
                <>
                    {/* Semi-transparent backdrop */}
                    <div
                        className="fixed inset-0 z-[200] bg-black/60 transition-opacity duration-300"
                        onClick={completeTour}
                    />

                    {/* Highlight cutout */}
                    {highlightRect && (
                        <div
                            className="fixed z-[201] rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none transition-all duration-300"
                            style={{
                                top: highlightRect.top - 4,
                                left: highlightRect.left - 4,
                                width: highlightRect.width + 8,
                                height: highlightRect.height + 8,
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                            }}
                        />
                    )}

                    {/* Tooltip */}
                    {step && (
                        <div
                            className="fixed z-[202] w-[300px] bg-card border border-border rounded-2xl shadow-2xl animate-slide-up"
                            style={getTooltipStyle()}
                        >
                            {/* Step indicator */}
                            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                                        Adım {currentStep + 1} / {tourSteps.length}
                                    </span>
                                </div>
                                <button
                                    onClick={completeTour}
                                    className="p-1 rounded-md hover:bg-muted transition-colors"
                                >
                                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                            </div>

                            <div className="px-4 pb-2">
                                <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                            </div>

                            {/* Progress bar */}
                            <div className="px-4 pb-3">
                                <div className="h-1 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-primary transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                                <button
                                    onClick={prevStep}
                                    disabled={currentStep === 0}
                                    className={cn(
                                        'flex items-center gap-1 text-xs font-medium transition-colors',
                                        currentStep === 0
                                            ? 'text-muted-foreground/40 cursor-not-allowed'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    Önceki
                                </button>
                                <button
                                    onClick={completeTour}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Atla
                                </button>
                                <button
                                    onClick={nextStep}
                                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                >
                                    {currentStep === tourSteps.length - 1 ? 'Bitir' : 'Sonraki'}
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </OnboardingContext.Provider>
    );
}
