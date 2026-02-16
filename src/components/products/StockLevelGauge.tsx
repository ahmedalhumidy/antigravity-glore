import { cn } from '@/lib/utils';

interface StockLevelGaugeProps {
  current: number;
  min: number;
  max?: number;
  size?: number;
}

export function StockLevelGauge({ current, min, max, size = 120 }: StockLevelGaugeProps) {
  const effectiveMax = max || Math.max(current * 2, min * 3, 100);
  const percentage = Math.min((current / effectiveMax) * 100, 100);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isLow = current < min;
  const isWarning = current >= min && current < min * 1.5;

  const color = isLow ? 'hsl(var(--destructive))' : isWarning ? 'hsl(var(--warning))' : 'hsl(var(--success))';
  const bgColor = isLow ? 'hsl(var(--destructive) / 0.1)' : isWarning ? 'hsl(var(--warning) / 0.1)' : 'hsl(var(--success) / 0.1)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(
          'text-2xl font-bold',
          isLow ? 'text-destructive' : isWarning ? 'text-warning' : 'text-success'
        )}>
          {current}
        </span>
        <span className="text-[10px] text-muted-foreground">/ {min} min</span>
      </div>
    </div>
  );
}
