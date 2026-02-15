import { useQuoteRequests } from '../hooks/useQuoteRequests';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Loader2 } from 'lucide-react';

const statusLabels: Record<string, { label: string; variant: string }> = {
  new: { label: 'Yeni', variant: 'default' },
  reviewed: { label: 'İncelendi', variant: 'secondary' },
  quoted: { label: 'Teklif Verildi', variant: 'outline' },
  accepted: { label: 'Kabul Edildi', variant: 'default' },
  rejected: { label: 'Reddedildi', variant: 'destructive' },
};

export default function AdminQuotesPage() {
  const { quotes, isLoading, updateStatus } = useQuoteRequests();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Teklif Talepleri</h2>
          <p className="text-sm text-muted-foreground">{quotes.length} talep</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>İsim</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Ürünler</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map(q => {
                const s = statusLabels[q.status] || statusLabels.new;
                return (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs">
                      {new Date(q.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{q.name}</p>
                        {q.email && <p className="text-xs text-muted-foreground">{q.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{q.company || '—'}</TableCell>
                    <TableCell className="text-sm">{q.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{q.items?.length || 0} ürün</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={q.status}
                        onValueChange={status => updateStatus.mutate({ id: q.id, status })}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
              {quotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Henüz teklif talebi yok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
