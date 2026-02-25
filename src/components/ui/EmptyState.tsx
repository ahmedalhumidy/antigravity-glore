import { LucideIcon, PackageOpen, Search, FileX, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: 'default' | 'search' | 'error' | 'filtered';
    className?: string;
    compact?: boolean;
}

const variantConfig = {
    default: {
        icon: PackageOpen,
        iconBg: 'bg-primary/8',
        iconColor: 'text-primary',
    },
    search: {
        icon: Search,
        iconBg: 'bg-muted',
        iconColor: 'text-muted-foreground',
    },
    error: {
        icon: AlertCircle,
        iconBg: 'bg-destructive/8',
        iconColor: 'text-destructive',
    },
    filtered: {
        icon: FileX,
        iconBg: 'bg-warning/8',
        iconColor: 'text-warning',
    },
};

export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    variant = 'default',
    className,
    compact = false,
}: EmptyStateProps) {
    const config = variantConfig[variant];
    const Icon = icon || config.icon;

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center animate-fade-in',
                compact ? 'py-8 px-4' : 'py-16 px-6',
                className
            )}
        >
            <div className={cn(
                'relative mb-4',
                compact ? 'w-12 h-12' : 'w-16 h-16'
            )}>
                {/* Animated ring */}
                <div className={cn(
                    'absolute inset-0 rounded-2xl motion-safe:animate-pulse',
                    config.iconBg,
                    'opacity-60'
                )} />
                <div className={cn(
                    'relative flex items-center justify-center w-full h-full rounded-2xl',
                    config.iconBg
                )}>
                    <Icon className={cn(
                        config.iconColor,
                        compact ? 'w-5 h-5' : 'w-7 h-7'
                    )} />
                </div>
            </div>

            <h3 className={cn(
                'font-semibold text-foreground mb-1',
                compact ? 'text-sm' : 'text-base'
            )}>
                {title}
            </h3>

            {description && (
                <p className={cn(
                    'text-muted-foreground max-w-xs leading-relaxed',
                    compact ? 'text-xs' : 'text-sm'
                )}>
                    {description}
                </p>
            )}

            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    size={compact ? 'sm' : 'default'}
                    className={cn(
                        'mt-4 shadow-md hover:shadow-lg transition-all duration-200 motion-safe:hover:-translate-y-0.5',
                        compact && 'h-8 text-xs'
                    )}
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
