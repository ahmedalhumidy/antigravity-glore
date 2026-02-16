import { useProductionStage } from '../hooks/useProductionStage';
import { useProductionUnits, ProductionUnit } from '../hooks/useProductionUnits';
import { Stamp, Scissors, Flame, Eraser, Paintbrush, ThermometerSun, PackageCheck, Drill, Loader2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

const stageIcons: Record<string, typeof Stamp> = {
  BASKI: Stamp, KESIM: Scissors, FIRIN: Flame, ZIMPARA: Eraser,
  DEKOR: Paintbrush, TUNEL: ThermometerSun, PAKET: PackageCheck, DABO: Drill,
};

const stageColors: Record<string, string> = {
  BASKI: 'bg-primary/10 text-primary',
  KESIM: 'bg-orange-500/10 text-orange-500',
  FIRIN: 'bg-red-500/10 text-red-500',
  ZIMPARA: 'bg-yellow-500/10 text-yellow-500',
  DEKOR: 'bg-purple-500/10 text-purple-500',
  TUNEL: 'bg-amber-600/10 text-amber-600',
  PAKET: 'bg-green-500/10 text-green-500',
  DABO: 'bg-sky-500/10 text-sky-500',
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  waiting: { label: 'Bekliyor', variant: 'secondary' },
  processing: { label: 'İşleniyor', variant: 'default' },
  completed: { label: 'Tamamlandı', variant: 'outline' },
  hold: { label: 'Beklemede', variant: 'destructive' },
};

const typeLabels: Record<string, string> = {
  process: 'Süreç', machine: 'Makine', storage: 'Depolama',
};

interface Props {
  code: string;
}

export default function ProductionStagePage({ code }: Props) {
  const { data: stage, isLoading: stageLoading } = useProductionStage(code);
  const { data: units, isLoading: unitsLoading } = useProductionUnits(stage?.id);

  if (stageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-destructive">Aşama yüklenemedi</p>
      </div>
    );
  }

  const Icon = stageIcons[code] || Stamp;
  const colorClass = stageColors[code] || 'bg-muted text-muted-foreground';
  const [bgClass, textClass] = colorClass.split(' ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${bgClass} flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${textClass}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{stage.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{typeLabels[stage.stage_type] || stage.stage_type}</Badge>
            <Badge variant="secondary" className="text-xs">Sıra: {stage.order_index}</Badge>
            <Badge variant="secondary" className="text-xs">
              {units?.length ?? 0} birim
            </Badge>
          </div>
        </div>
      </div>

      {/* Live list */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Şu an burada olanlar</h2>

        {unitsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !units || units.length === 0 ? (
          <Card className="p-8 flex flex-col items-center gap-2 text-center">
            <Package className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Bu aşamada henüz birim yok</p>
          </Card>
        ) : (
          <div className="grid gap-2">
            {units.map((unit) => {
              const status = statusConfig[unit.status] || statusConfig.waiting;
              return (
                <Card key={unit.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="font-mono text-sm font-semibold text-foreground truncate">
                      {unit.barcode}
                    </div>
                    {unit.product && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        {unit.product.urun_kodu} — {unit.product.urun_adi}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground hidden md:inline">
                      {formatDistanceToNow(new Date(unit.last_move_at), { addSuffix: true, locale: tr })}
                    </span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
