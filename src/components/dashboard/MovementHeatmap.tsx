import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { StockMovement } from '@/types/stock';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface MovementHeatmapProps {
    movements: StockMovement[];
}

export function MovementHeatmap({ movements }: MovementHeatmapProps) {
    const { weeks, maxCount } = useMemo(() => {
        const now = new Date();
        const dayMap: Record<string, number> = {};

        // Build map of all movement dates
        movements.forEach(m => {
            dayMap[m.date] = (dayMap[m.date] || 0) + 1;
        });

        // Generate last 12 weeks (84 days)
        const totalDays = 84;
        const allDays: { date: string; count: number; dayOfWeek: number }[] = [];

        for (let i = totalDays - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            allDays.push({
                date: dateStr,
                count: dayMap[dateStr] || 0,
                dayOfWeek: d.getDay(),
            });
        }

        // Group into weeks
        const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];
        let currentWeek: typeof allDays = [];

        // Fill in empty days at the start of first week
        if (allDays.length > 0) {
            const firstDay = allDays[0].dayOfWeek;
            for (let i = 0; i < firstDay; i++) {
                currentWeek.push({ date: '', count: -1, dayOfWeek: i });
            }
        }

        allDays.forEach(day => {
            if (day.dayOfWeek === 0 && currentWeek.length > 0) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
            currentWeek.push(day);
        });
        if (currentWeek.length > 0) {
            weeks.push(currentWeek);
        }

        const maxCount = Math.max(1, ...allDays.map(d => d.count));

        return { weeks, maxCount };
    }, [movements]);

    const getIntensityClass = (count: number): string => {
        if (count < 0) return 'bg-transparent';
        if (count === 0) return 'bg-muted/60 dark:bg-muted/30';
        const ratio = count / maxCount;
        if (ratio <= 0.25) return 'bg-success/20 dark:bg-success/25';
        if (ratio <= 0.5) return 'bg-success/40 dark:bg-success/45';
        if (ratio <= 0.75) return 'bg-success/60 dark:bg-success/65';
        return 'bg-success/90 dark:bg-success/85';
    };

    const dayLabels = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

    return (
        <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-success/8">
                        <CalendarDays className="w-3.5 h-3.5 text-success" />
                    </div>
                    Hareket Yoğunluk Haritası
                    <span className="text-[10px] text-muted-foreground font-normal ml-auto">
                        Son 12 hafta
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
                <div className="flex gap-0.5">
                    {/* Day labels */}
                    <div className="flex flex-col gap-0.5 mr-1 pt-0">
                        {dayLabels.map((label, i) => (
                            <div
                                key={i}
                                className="h-[13px] flex items-center text-[9px] text-muted-foreground leading-none"
                            >
                                {i % 2 === 1 ? label : ''}
                            </div>
                        ))}
                    </div>

                    {/* Heatmap grid */}
                    <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
                        {weeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-0.5">
                                {week.map((day, di) => (
                                    <Tooltip key={`${wi}-${di}`} delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    'w-[13px] h-[13px] rounded-[3px] transition-all duration-150 cursor-default',
                                                    getIntensityClass(day.count),
                                                    day.count >= 0 && 'hover:ring-1 hover:ring-foreground/20 motion-safe:hover:scale-125'
                                                )}
                                            />
                                        </TooltipTrigger>
                                        {day.count >= 0 && (
                                            <TooltipContent
                                                side="top"
                                                className="text-xs px-2 py-1"
                                            >
                                                <p className="font-medium">
                                                    {new Date(day.date).toLocaleDateString('tr-TR', {
                                                        weekday: 'short',
                                                        day: 'numeric',
                                                        month: 'short',
                                                    })}
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {day.count} hareket
                                                </p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-1.5 mt-2.5">
                    <span className="text-[9px] text-muted-foreground">Az</span>
                    {[
                        'bg-muted/60 dark:bg-muted/30',
                        'bg-success/20 dark:bg-success/25',
                        'bg-success/40 dark:bg-success/45',
                        'bg-success/60 dark:bg-success/65',
                        'bg-success/90 dark:bg-success/85',
                    ].map((cls, i) => (
                        <div key={i} className={cn('w-[10px] h-[10px] rounded-[2px]', cls)} />
                    ))}
                    <span className="text-[9px] text-muted-foreground">Çok</span>
                </div>
            </CardContent>
        </Card>
    );
}
