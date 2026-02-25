import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
    variant?: 'dashboard' | 'list' | 'page';
    className?: string;
}

function SkeletonPulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div className={cn('rounded-lg bg-muted/60 animate-pulse shimmer', className)} style={style} />
    );
}

export function LoadingSkeleton({ variant = 'page', className }: LoadingSkeletonProps) {
    if (variant === 'dashboard') {
        return (
            <div className={cn('space-y-4 p-4 md:p-6 animate-fade-in', className)}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <SkeletonPulse className="h-6 w-40" />
                        <SkeletonPulse className="h-4 w-56" />
                    </div>
                    <div className="flex gap-2">
                        <SkeletonPulse className="h-9 w-24 rounded-xl" />
                        <SkeletonPulse className="h-9 w-24 rounded-xl" />
                    </div>
                </div>
                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => (
                        <SkeletonPulse key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                {/* Chart */}
                <SkeletonPulse className="h-72 rounded-xl" />
                {/* Cards row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <SkeletonPulse className="h-64 rounded-xl" />
                    <SkeletonPulse className="h-64 rounded-xl" />
                    <SkeletonPulse className="h-64 rounded-xl" />
                </div>
            </div>
        );
    }

    if (variant === 'list') {
        return (
            <div className={cn('space-y-3 p-4 md:p-6 animate-fade-in', className)}>
                <SkeletonPulse className="h-10 w-full rounded-xl" />
                <div className="flex gap-2">
                    {[...Array(4)].map((_, i) => (
                        <SkeletonPulse key={i} className="h-8 w-20 rounded-full" />
                    ))}
                </div>
                <div className="space-y-2">
                    {[...Array(8)].map((_, i) => (
                        <SkeletonPulse key={i} className="h-16 rounded-xl" style={{ animationDelay: `${i * 50}ms` }} />
                    ))}
                </div>
            </div>
        );
    }

    // Default page skeleton
    return (
        <div className={cn('flex items-center justify-center min-h-[60vh]', className)}>
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">Yükleniyor...</p>
            </div>
        </div>
    );
}
