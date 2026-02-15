import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { QuoteCartItem } from '../types';

export function useQuoteCart() {
  const [items, setItems] = useState<QuoteCartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addItem = useCallback((item: Omit<QuoteCartItem, 'quantity' | 'unit' | 'note'> & Partial<Pick<QuoteCartItem, 'quantity' | 'unit' | 'note'>>) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === item.type);
      if (existing) {
        return prev.map(i =>
          i.id === item.id && i.type === item.type
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }
      return [...prev, { quantity: 1, unit: 'adet', note: '', ...item }];
    });
    toast.success('Teklif sepetine eklendi');
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i));
  }, []);

  const updateNote = useCallback((id: string, note: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, note } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const submitQuote = useCallback(async (info: {
    name: string;
    phone?: string;
    email?: string;
    company?: string;
    notes?: string;
    customer_id?: string;
  }) => {
    if (items.length === 0) {
      toast.error('Teklif sepeti boş');
      return false;
    }

    setSubmitting(true);
    try {
      const { data: quote, error: quoteError } = await supabase
        .from('quote_requests')
        .insert({
          name: info.name,
          phone: info.phone || null,
          email: info.email || null,
          company: info.company || null,
          notes: info.notes || null,
          customer_id: info.customer_id || null,
        })
        .select('id')
        .single();

      if (quoteError) throw quoteError;

      const quoteItems = items.map(item => ({
        quote_id: quote.id,
        product_id: item.type === 'store' ? item.product_id : null,
        gallery_id: item.type === 'gallery' ? item.gallery_id : null,
        quantity: item.quantity,
        unit: item.unit,
        note: item.note || null,
      }));

      const { error: itemsError } = await supabase
        .from('quote_request_items')
        .insert(quoteItems);

      if (itemsError) throw itemsError;

      clearCart();
      toast.success('Teklif talebiniz gönderildi!');
      return true;
    } catch (err: any) {
      toast.error('Teklif gönderilemedi: ' + err.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [items, clearCart]);

  return {
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    addItem,
    removeItem,
    updateQuantity,
    updateNote,
    clearCart,
    submitQuote,
    submitting,
  };
}
