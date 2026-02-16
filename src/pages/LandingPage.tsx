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
} from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#101729] to-[#0c1220] text-white selection:bg-blue-500/30">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
        <span className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wider uppercase text-blue-300 backdrop-blur mb-6">
          Kurumsal Depo Yönetim Platformu
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight max-w-3xl">
          <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
            Depo Yönetim
          </span>
          <br />
          Sistemi
        </h1>

        <p className="mt-5 max-w-xl text-sm sm:text-base text-white/50 leading-relaxed">
          Envanter, mağaza, galeri ve lojistik operasyonlarınızı tek bir platformda yönetin.
          Gerçek zamanlı stok takibi, barkod tarama ve akıllı raporlama.
        </p>

        {/* Live stats */}
        <div className="mt-8 flex gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
            <Package size={16} className="text-cyan-400" />
            <span className="text-sm font-semibold">{stats.products.toLocaleString("tr-TR")}</span>
            <span className="text-xs text-white/40">Ürün</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
            <BarChart3 size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold">{stats.stock.toLocaleString("tr-TR")}</span>
            <span className="text-xs text-white/40">Stok</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-2.5 text-sm font-semibold shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 hover:scale-[1.03]"
          >
            Depoya Git
          </Link>
          <Link
            to="/magaza"
            className="rounded-lg border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/10 hover:scale-[1.03]"
          >
            Mağazaya Git
          </Link>
          <Link
            to="/galeri"
            className="rounded-lg border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/10 hover:scale-[1.03]"
          >
            Galeriyi Gör
          </Link>
        </div>
      </section>

      {/* Module cards */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <Link
              key={m.title}
              to={m.href}
              className="group rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.15] hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${m.color} shadow-lg`}
              >
                <m.icon size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-white/90 group-hover:text-white transition-colors">
                {m.title}
              </h3>
              <p className="mt-1 text-xs text-white/40 leading-relaxed">{m.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-white/25">
        Depo Yönetim Sistemi — Kurumsal Çözüm
      </footer>
    </div>
  );
}
