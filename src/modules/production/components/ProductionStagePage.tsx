import { useProductionStage } from '../hooks/useProductionStage';
import { Stamp, Scissors, Flame, Eraser, Paintbrush, ThermometerSun, PackageCheck, Drill, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const stageIcons: Record<string, typeof Stamp> = {
  BASKI: Stamp,
  KESIM: Scissors,
  FIRIN: Flame,
  ZIMPARA: Eraser,
  DEKOR: Paintbrush,
  TUNEL: ThermometerSun,
  PAKET: PackageCheck,
  DABO: Drill,
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

const typeLabels: Record<string, string> = {
  process: 'Süreç',
  machine: 'Makine',
  storage: 'Depolama',
};

interface Props {
  code: string;
}

export default function ProductionStagePage({ code }: Props) {
  const { data: stage, isLoading, error } = useProductionStage(code);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stage) {
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className={`w-16 h-16 rounded-2xl ${bgClass} flex items-center justify-center`}>
        <Icon className={`w-8 h-8 ${textClass}`} />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{stage.name}</h1>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">{typeLabels[stage.stage_type] || stage.stage_type}</Badge>
        <Badge variant="secondary" className="text-xs">Sıra: {stage.order_index}</Badge>
      </div>
      <p className="text-muted-foreground text-sm">Üretim aşaması — yakında aktif olacak</p>
    </div>
  );
}
