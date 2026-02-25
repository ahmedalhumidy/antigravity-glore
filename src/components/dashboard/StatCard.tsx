import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { AnimatedCounter } from './AnimatedCounter';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  comparison?: {
    current: number;
    previous: number;
    label?: string;
  };
  sparklineData?: number[];
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'destructive';
  compact?: boolean;
}

const variantStyles = {
  default: 'bg-card border-border/60',
  primary: 'gradient-primary text-primary-foreground border-transparent',
  accent: 'gradient-accent text-accent-foreground border-transparent',
  success: 'gradient-success text-success-foreground border-transparent',
  warning: 'bg-warning text-warning-foreground border-transparent',
  destructive: 'bg-destructive text-destructive-foreground border-transparent',
};

const iconBgStyles = {
  default: 'bg-primary/8 text-primary',
  primary: 'bg-white/15 text-white',
  accent: 'bg-white/15 text-white',
  success: 'bg-white/15 text-white',
  warning: 'bg-white/15 text-white',
  destructive: 'bg-white/15 text-white',
};

const sparklineColors = {
  default: 'hsl(var(--primary))',
  primary: 'rgba(255,255,255,0.8)',
  accent: 'rgba(255,255,255,0.8)',
  success: 'rgba(255,255,255,0.8)',
  warning: 'rgba(255,255,255,0.8)',
  destructive: 'rgba(255,255,255,0.8)',
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  comparison,
  sparklineData,
  variant = 'default',
  compact = false
}: StatCardProps) {
  const isColored = variant !== 'default';

  const comparisonData = comparison ? (() => {
    const diff = comparison.current - comparison.previous;
    const percentage = comparison.previous > 0
      ? Math.round((diff / comparison.previous) * 100)
      : diff > 0 ? 100 : 0;
    return { diff, percentage, isPositive: diff >= 0 };
  })() : null;

  const chartData = sparklineData?.map((v, i) => ({ v, i }));

  return (
    <div className={cn(
      'stat-card-enhanced animate-fade-in border relative overflow-hidden',
      variantStyles[variant],
      compact && 'p-3 md:p-4'
    )}>
      {/* Sparkline background */}
      {chartData && chartData.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparklineColors[variant]}
                fill={sparklineColors[variant]}
                fillOpacity={0.15}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 md:gap-3 relative z-10">
        <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
          <p className={cn(
            'text-[10px] md:text-xs font-medium uppercase tracking-wide truncate',
            isColored ? 'text-white/70' : 'text-muted-foreground'
          )}>
            {title}
          </p>
          <p className={cn(
            'text-lg md:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums',
            isColored ? 'text-white' : 'text-foreground'
          )}>
            {typeof value === 'number' ? (
              <AnimatedCounter value={value} className="tabular-nums" />
            ) : (
              value
            )}
          </p>

          {trend && (
            <p className={cn(
              'text-xs flex items-center gap-1',
              isColored ? 'text-white/70' : 'text-muted-foreground'
            )}>
              <span className={cn(
                'font-medium inline-flex items-center gap-0.5',
                trend.value >= 0 ? 'text-success' : 'text-destructive',
                isColored && (trend.value >= 0 ? 'text-white/90' : 'text-white/90')
              )}>
                {trend.value >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="ml-0.5">{trend.label}</span>
            </p>
          )}

          {comparisonData && (
            <div className={cn(
              'flex items-center gap-1.5 text-xs',
              isColored ? 'text-white/70' : 'text-muted-foreground'
            )}>
              <span className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                comparisonData.isPositive
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive',
                isColored && 'bg-white/20 text-white'
              )}>
                {comparisonData.isPositive ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5" />
                )}
                {comparisonData.isPositive ? '+' : ''}{comparisonData.percentage}%
              </span>
              <span>{comparison.label || 'vs dün'}</span>
            </div>
          )}
        </div>

        <div className={cn(
          'flex-shrink-0 p-2 md:p-3 rounded-lg md:rounded-xl transition-transform duration-200',
          iconBgStyles[variant]
        )}>
          <Icon className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
        </div>
      </div>
    </div>
  );
}
