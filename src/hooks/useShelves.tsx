import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Shelf {
  id: string;
  name: string;
  description?: string;
  capacity?: number | null;
  zone?: string | null;
  created_at: string;
}

export function useShelves() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShelves = async () => {
    try {
      const { data, error } = await supabase
        .from('shelves')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setShelves(data || []);
    } catch (error) {
      console.error('Error fetching shelves:', error);
      toast.error('Raflar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShelves();
  }, []);

  const addShelf = async (name: string, description?: string): Promise<Shelf | null> => {
    try {
      const trimmedName = name.trim();
      
      // Check if shelf already exists locally (exact match)
      const existingShelf = shelves.find(s => s.name === trimmedName);
      if (existingShelf) {
        toast.info(`"${trimmedName}" rafı zaten listede mevcut`);
        return existingShelf;
      }

      // Try to insert - let database handle uniqueness
      const { data, error } = await supabase
        .from('shelves')
        .insert({ name: trimmedName, description })
        .select()
        .single();

      if (error) {
        // Handle duplicate key error (shelf exists in DB but not in local state)
        if (error.code === '23505') {
          // Fetch the existing shelf from database
          const { data: existingInDb } = await supabase
            .from('shelves')
            .select('*')
            .eq('name', trimmedName)
            .maybeSingle();

          if (existingInDb) {
            // Add to local state if not already there
            setShelves(prev => {
              const exists = prev.some(s => s.id === existingInDb.id);
              if (!exists) {
                return [...prev, existingInDb].sort((a, b) => a.name.localeCompare(b.name));
              }
              return prev;
            });
            toast.info(`"${trimmedName}" rafı veritabanında zaten mevcut, listeye eklendi`);
            return existingInDb;
          }
        }
        throw error;
      }

      // Successfully inserted - update local state
      setShelves(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`"${trimmedName}" rafı eklendi`);
      return data;
    } catch (error: any) {
      console.error('Error adding shelf:', error);
      toast.error('Raf eklenirken hata oluştu');
      return null;
    }
  };

  const updateShelf = async (id: string, name: string, description?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('shelves')
        .update({ name, description })
        .eq('id', id);

      if (error) throw error;

      setShelves(prev => prev.map(s => s.id === id ? { ...s, name, description } : s));
      toast.success('Raf güncellendi');
      return true;
    } catch (error) {
      console.error('Error updating shelf:', error);
      toast.error('Raf güncellenirken hata oluştu');
      return false;
    }
  };

  const deleteShelf = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('shelves')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setShelves(prev => prev.filter(s => s.id !== id));
      toast.success('Raf silindi');
      return true;
    } catch (error) {
      console.error('Error deleting shelf:', error);
      toast.error('Raf silinirken hata oluştu');
      return false;
    }
  };

  const getShelfByName = (name: string): Shelf | undefined => {
    return shelves.find(s => s.name === name);
  };

  const refreshShelves = () => {
    setLoading(true);
    fetchShelves();
  };

  return {
    shelves,
    loading,
    addShelf,
    updateShelf,
    deleteShelf,
    getShelfByName,
    refreshShelves,
  };
}
