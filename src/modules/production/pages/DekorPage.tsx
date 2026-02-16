import { Paintbrush } from 'lucide-react';

export default function DekorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
        <Paintbrush className="w-8 h-8 text-purple-500" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Dekor</h1>
      <p className="text-muted-foreground text-sm">Üretim aşaması — yakında aktif olacak</p>
    </div>
  );
}
