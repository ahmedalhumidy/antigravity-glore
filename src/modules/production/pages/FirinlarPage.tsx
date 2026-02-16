import { Flame } from 'lucide-react';

export default function FirinlarPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <Flame className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Fırınlar</h1>
      <p className="text-muted-foreground text-sm">Üretim aşaması — yakında aktif olacak</p>
    </div>
  );
}
