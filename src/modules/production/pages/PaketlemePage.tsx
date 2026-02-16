import { PackageCheck } from 'lucide-react';

export default function PaketlemePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
        <PackageCheck className="w-8 h-8 text-green-500" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Paketleme</h1>
      <p className="text-muted-foreground text-sm">Üretim aşaması — yakında aktif olacak</p>
    </div>
  );
}
