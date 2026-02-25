import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Warehouse,
  ShoppingBag,
  Image,
  PackageSearch,
  ArrowLeftRight,
  Printer,
  Package,
  BarChart3,
  Shield,
  Zap,
  Globe,
  Smartphone,
} from "lucide-react";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";

const modules = [
  {
    title: "Depo Yönetimi",
    desc: "WMS, envanter takibi, lokasyon yönetimi",
    icon: Warehouse,
    color: "from-blue-500 to-cyan-400",
    href: "/",
  },
  {
    title: "Mağaza",
    desc: "B2C / B2B satış portali",
    icon: ShoppingBag,
    color: "from-purple-500 to-pink-400",
    href: "/magaza",
  },
  {
    title: "Galeri",
    desc: "Ürün galerisi ve görsel katalog",
    icon: Image,
    color: "from-amber-500 to-orange-400",
    href: "/galeri",
  },
  {
    title: "Ürün Kataloğu",
    desc: "Stok durumu, barkod bilgileri",
    icon: PackageSearch,
    color: "from-emerald-500 to-green-400",
    href: "/products",
  },
  {
    title: "Stok Hareketleri",
    desc: "Giriş, çıkış, transfer işlemleri",
    icon: ArrowLeftRight,
    color: "from-rose-500 to-red-400",
    href: "/movements",
  },
  {
    title: "Etiket Yazdırma",
    desc: "Barkod etiketleri oluştur ve yazdır",
    icon: Printer,
    color: "from-slate-400 to-zinc-500",
    href: "/products",
  },
];

const features = [
  {
    icon: Zap,
    title: "Gerçek Zamanlı",
    desc: "Anlık stok güncellemeleri ve bildirimler",
  },
  {
    icon: Shield,
    title: "Güvenli",
    desc: "Rol tabanlı erişim kontrolü ve denetim",
  },
  {
    icon: Smartphone,
    title: "Mobil Uyumlu",
    desc: "PWA ile her cihazda çalışır",
  },
  {
    icon: Globe,
    title: "Çevrimdışı",
    desc: "İnternet olmadan da çalışmaya devam edin",
  },
];

export default function LandingPage() {
  const [stats, setStats] = useState({ products: 0, stock: 0 });

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false);
      const { data } = await supabase
        .from("products")
        .select("mevcut_stok")
        .eq("is_deleted", false);
      const totalStock = (data || []).reduce((s, r) => s + (r.mevcut_stok || 0), 0);
      setStats({ products: count || 0, stock: totalStock });
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#101729] to-[#0c1220] text-white selection:bg-blue-500/30 overflow-hidden">
      {/* Floating background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/[0.07] blur-3xl animate-float" />
        <div
          className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-purple-500/[0.05] blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-cyan-500/[0.06] blur-3xl animate-float"
          style={{ animationDelay: "4s" }}
        />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-20 pb-16 md:pt-32 md:pb-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium tracking-wider uppercase text-blue-300 backdrop-blur-sm mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Kurumsal Depo Yönetim Platformu
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight max-w-4xl animate-slide-up">
          <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradientShift_4s_ease_infinite]">
            Akıllı Depo
          </span>
          <br />
          <span className="text-white/90">Yönetim Sistemi</span>
        </h1>

        <p
          className="mt-6 max-w-xl text-sm sm:text-base text-white/45 leading-relaxed animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          Envanter, mağaza, galeri ve lojistik operasyonlarınızı tek bir
          platformda yönetin. Gerçek zamanlı stok takibi, barkod tarama ve
          akıllı raporlama.
        </p>

        {/* Live stats */}
        <div
          className="mt-10 flex gap-4 animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 backdrop-blur-sm">
            <Package size={18} className="text-cyan-400" />
            <span className="text-lg font-bold tabular-nums">
              <AnimatedCounter value={stats.products} />
            </span>
            <span className="text-xs text-white/35">Ürün</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 backdrop-blur-sm">
            <BarChart3 size={18} className="text-emerald-400" />
            <span className="text-lg font-bold tabular-nums">
              <AnimatedCounter value={stats.stock} />
            </span>
            <span className="text-xs text-white/35">Stok</span>
          </div>
        </div>

        {/* CTAs */}
        <div
          className="mt-10 flex flex-wrap justify-center gap-3 animate-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          <Link
            to="/"
            className="group relative rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-7 py-3 text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-[1.03] hover:-translate-y-0.5 overflow-hidden"
          >
            <span className="relative z-10">Depoya Git</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <Link
            to="/magaza"
            className="rounded-xl border border-white/15 bg-white/[0.04] px-7 py-3 text-sm font-semibold backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-white/25 hover:scale-[1.03] hover:-translate-y-0.5"
          >
            Mağazaya Git
          </Link>
          <Link
            to="/galeri"
            className="rounded-xl border border-white/15 bg-white/[0.04] px-7 py-3 text-sm font-semibold backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-white/25 hover:scale-[1.03] hover:-translate-y-0.5"
          >
            Galeriyi Gör
          </Link>
        </div>
      </section>

      {/* Features strip */}
      <section className="relative mx-auto max-w-5xl px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm"
            >
              <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/10">
                <f.icon size={16} className="text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/85">{f.title}</p>
                <p className="text-[10px] text-white/35 leading-relaxed truncate">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Module cards */}
      <section className="relative mx-auto max-w-5xl px-4 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white/90">
            Modüller
          </h2>
          <p className="mt-2 text-sm text-white/40">
            İşletmenizin tüm ihtiyaçlarına tek platformdan erişin
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {modules.map((m) => (
            <Link
              key={m.title}
              to={m.href}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12] hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 overflow-hidden"
            >
              {/* Subtle glow on hover */}
              <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${m.color} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 blur-xl`} />

              <div className="relative z-10">
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${m.color} shadow-lg transition-transform duration-300 group-hover:scale-110`}
                >
                  <m.icon size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-white/90 group-hover:text-white transition-colors">
                  {m.title}
                </h3>
                <p className="mt-1.5 text-xs text-white/35 leading-relaxed group-hover:text-white/50 transition-colors">
                  {m.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/[0.06] py-8 text-center">
        <p className="text-xs text-white/25">
          © {new Date().getFullYear()} Depo Yönetim Sistemi — Kurumsal Çözüm
        </p>
      </footer>
    </div>
  );
}
