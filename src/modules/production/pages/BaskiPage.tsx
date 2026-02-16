import { Stamp } from 'lucide-react';

export default function BaskiPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Stamp className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Baskı</h1>
      <p className="text-muted-foreground text-sm">Üretim aşaması — yakında aktif olacak</p>
    </div>
  );
}
