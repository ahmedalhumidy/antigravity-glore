import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, FileText, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import { useSystemSettings } from '@/hooks/useSystemSettings';

interface MagazaHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function MagazaHeader({ searchQuery, onSearchChange }: MagazaHeaderProps) {
  const navigate = useNavigate();
  const { itemCount } = useQuoteCartContext();
  const { organization } = useSystemSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const companyName = organization?.name || 'GLORE';

  const navLinks = [
    { label: 'Mağaza', path: '/magaza' },
    { label: 'Galeri', path: '/galeri' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/magaza" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl font-bold text-foreground">{companyName}</span>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Mağaza</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(l => (
            <Link key={l.path} to={l.path} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ürün ara... (isim, kod, barkod)"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-9 h-9 bg-secondary/50 border-transparent focus:border-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate('/magaza/sepet')}
          >
            <FileText className="w-5 h-5" />
            {itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-accent text-accent-foreground">
                {itemCount}
              </Badge>
            )}
          </Button>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 mt-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Ürün ara..."
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {navLinks.map(l => (
                  <Link
                    key={l.path}
                    to={l.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-foreground py-2 border-b border-border"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  to="/magaza/sepet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-foreground py-2 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Teklif Sepeti ({itemCount})
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
