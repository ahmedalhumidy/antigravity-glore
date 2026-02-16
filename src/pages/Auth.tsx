import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Package, LogIn, UserPlus, Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const emailSchema = z.string().email('Geçerli bir e-posta adresi girin');
const passwordSchema = z.string()
  .min(8, 'Şifre en az 8 karakter olmalı')
  .regex(/[a-z]/, 'En az bir küçük harf içermelidir')
  .regex(/[A-Z]/, 'En az bir büyük harf içermelidir')
  .regex(/[0-9]/, 'En az bir rakam içermelidir')
  .regex(/[^a-zA-Z0-9]/, 'En az bir özel karakter içermelidir');

type AuthView = 'login' | 'register' | 'forgot';

export default function Auth() {
  const navigate = useNavigate();
  const [view, setView] = useState<AuthView>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const validateInputs = () => {
    try { emailSchema.parse(email); } catch {
      toast.error('Geçerli bir e-posta adresi girin');
      return false;
    }
    if (view !== 'forgot') {
      try { passwordSchema.parse(password); } catch {
        toast.error('Şifre gereksinimlerini karşılamıyor');
        return false;
      }
    }
    if (view === 'register' && !fullName.trim()) {
      toast.error('Lütfen adınızı girin');
      return false;
    }
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    setLoading(true);

    try {
      if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) { toast.error(error.message); return; }
        toast.success('Şifre sıfırlama bağlantısı gönderildi!');
        setView('login');
        return;
      }

      if (view === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) toast.error('E-posta veya şifre hatalı');
          else if (error.message.includes('Email not confirmed')) toast.error('E-posta adresinizi doğrulayın');
          else toast.error(error.message);
          return;
        }
        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('user_id', data.user.id).single();
          if (profile?.is_disabled) {
            await supabase.auth.signOut();
            toast.error('Hesabınız devre dışı bırakıldı. Yöneticiyle iletişime geçin.');
            return;
          }
        }
        toast.success('Giriş başarılı!');
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: fullName } },
        });
        if (error) {
          if (error.message.includes('already registered')) toast.error('Bu e-posta adresi zaten kayıtlı');
          else toast.error(error.message);
          return;
        }
        toast.success('Kayıt başarılı! Lütfen e-posta adresinizi doğrulayın.');
      }
    } catch {
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        {/* Animated pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary-foreground)) 1px, transparent 1px),
                              radial-gradient(circle at 75% 75%, hsl(var(--primary-foreground)) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-primary-foreground">
          <div className="w-20 h-20 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center mb-8 shadow-2xl">
            <Package className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">Stok Takip</h1>
          <p className="text-lg text-primary-foreground/80 text-center max-w-sm leading-relaxed">
            Profesyonel envanter yönetim sistemi ile stoklarınızı gerçek zamanlı takip edin
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { label: 'Gerçek Zamanlı', desc: 'Anlık stok takibi' },
              { label: 'Barkod Desteği', desc: 'Hızlı tarama' },
              { label: 'Raporlama', desc: 'Detaylı analiz' },
            ].map(f => (
              <div key={f.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4">
                <p className="font-semibold text-sm">{f.label}</p>
                <p className="text-xs text-primary-foreground/60 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="mx-auto mb-4 w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Stok Takip Sistemi</h1>
          </div>

          <Card className="border-0 shadow-none lg:border lg:shadow-lg">
            <CardContent className="p-0 lg:p-8">
              {view === 'forgot' && (
                <button onClick={() => setView('login')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Geri dön
                </button>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  {view === 'login' ? 'Hoş Geldiniz' : view === 'register' ? 'Hesap Oluşturun' : 'Şifre Sıfırlama'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {view === 'login' ? 'Hesabınıza giriş yapın' : view === 'register' ? 'Yeni bir hesap oluşturun' : 'E-posta adresinize sıfırlama bağlantısı göndereceğiz'}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {view === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Ad Soyad</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="fullName" type="text" placeholder="Ad Soyad" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} className="pl-10" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="ornek@sirket.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} className="pl-10" />
                  </div>
                </div>

                {view !== 'forgot' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Şifre</Label>
                      {view === 'login' && (
                        <button type="button" onClick={() => setView('forgot')} className="text-xs text-primary hover:underline">Şifremi unuttum</button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} className="pl-10" />
                    </div>
                    {view === 'register' && password && (
                      <div className="text-xs space-y-1 mt-2">
                        <ul className="grid grid-cols-2 gap-1">
                          {[
                            { check: password.length >= 8, label: '8+ karakter' },
                            { check: /[a-z]/.test(password), label: 'Küçük harf' },
                            { check: /[A-Z]/.test(password), label: 'Büyük harf' },
                            { check: /[0-9]/.test(password), label: 'Rakam' },
                            { check: /[^a-zA-Z0-9]/.test(password), label: 'Özel karakter' },
                          ].map((req) => (
                            <li key={req.label} className={cn('flex items-center gap-1', req.check ? 'text-success' : 'text-muted-foreground')}>
                              <span className={cn('w-4 h-4 rounded-full border flex items-center justify-center text-[10px]', req.check ? 'bg-success/10 border-success text-success' : 'border-border')}>
                                {req.check ? '✓' : ''}
                              </span>
                              {req.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : view === 'login' ? (
                    <LogIn className="w-4 h-4 mr-2" />
                  ) : view === 'register' ? (
                    <UserPlus className="w-4 h-4 mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {view === 'login' ? 'Giriş Yap' : view === 'register' ? 'Kayıt Ol' : 'Bağlantı Gönder'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setView(view === 'login' ? 'register' : 'login')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  disabled={loading}
                >
                  {view === 'login' ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
