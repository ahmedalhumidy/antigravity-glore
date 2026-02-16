import { ThermometerSun } from 'lucide-react';

export default function TunelFirinPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-600/10 flex items-center justify-center">
        <ThermometerSun className="w-8 h-8 text-amber-600" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Tünel Fırın</h1>
      <p className="text-muted-foreground text-sm">Üretim aşaması — yakında aktif olacak</p>
    </div>
  );
}
