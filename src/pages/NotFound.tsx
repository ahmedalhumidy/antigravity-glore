import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/[0.03] blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-accent/[0.03] blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative text-center max-w-md">
        {/* Large 404 */}
        <h1 className="text-[120px] sm:text-[160px] font-black leading-none tracking-tighter gradient-text opacity-80 select-none">
          404
        </h1>

        <div className="mt-2 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Sayfa Bulunamadı
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
            <br />
            <span className="text-xs text-muted-foreground/60 font-mono">{location.pathname}</span>
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            Ana Sayfa
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted/50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri Dön
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
