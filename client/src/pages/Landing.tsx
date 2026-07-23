import { useEffect, useRef, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Pill, Stethoscope, HeartPulse, Syringe, Leaf, Baby,
  Bath, Sparkles, Droplets, ShoppingBasket, Package, Sun,
  ShieldCheck, Store, Clock, MapPin, Phone, Mail,
  ArrowRight, Star, Truck, ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Public storefront landing page for Arbuda Medical & General Store.
 * The colour language is taken directly from the shop banner: a bright yellow
 * field, royal-blue store name, red highlights, a magenta/pink border and a
 * green medical cross. The hero shows the shop banner full-screen. Store
 * name/address/phone/email/map are pulled from the public settings endpoint.
 */

interface StoreInfo {
  storeName: string;
  address: string;
  phone: string;
  email: string;
  mapEmbedUrl: string;
}

const FALLBACK: StoreInfo = {
  storeName: 'Arbuda Medical & General Store',
  address: 'Jaswantpura Circle, Ramseen, Dist. Jalore, Rajasthan',
  phone: '+91 81073 37934',
  email: 'arbudastore@example.com',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3615.714921287445!2d72.53431320190431!3d25.009801088839914!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3943198c293fc4a5%3A0x1368e21390fd137f!2sARBUDA%20MEDICAL%20%26%20GENERAL%20STORE!5e0!3m2!1sen!2sin!4v1784381578985!5m2!1sen!2sin',
};

const HOURS = 'Mon – Sun · 8:00 AM to 10:00 PM';

/* Subtle medical "plus" pattern used behind category media bands. */
const CROSS_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M15 6h6v9h9v6h-9v9h-6v-9H6v-6h9z' fill='%23ffffff' fill-opacity='0.14'/%3E%3C/svg%3E\")";

/* ---------- Scroll-reveal wrapper (respects reduced-motion via index.css) ---------- */
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-out will-change-transform',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ---------- Count-up number (animates when scrolled into view) ---------- */
function CountUp({ end, suffix = '' }: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
          setVal(end);
          return;
        }
        const duration = 1400;
        let startTs: number | null = null;
        const step = (ts: number) => {
          if (startTs === null) startTs = ts;
          const p = Math.min(1, (ts - startTs) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(end * eased));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [end]);

  return (
    <span ref={ref}>
      {val.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

interface Cat {
  icon: typeof Pill;
  title: string;
  desc: string;
  grad: string; // tailwind gradient classes for the media band
  slug: string; // optional photo at /img/<slug>.jpg
}

const PHARMACY: Cat[] = [
  { icon: Stethoscope, title: 'Prescription Medicines', desc: 'Full range of Rx drugs dispensed by licensed pharmacists.', grad: 'from-brand-blue to-accent-600', slug: 'prescription' },
  { icon: Pill, title: 'OTC & Everyday Medicines', desc: 'Fever, cold, pain relief, antacids and common remedies.', grad: 'from-brand-green to-emerald-600', slug: 'otc' },
  { icon: HeartPulse, title: 'Chronic Care', desc: 'Diabetes, blood pressure, cardiac and thyroid medication.', grad: 'from-brand-red to-rose-600', slug: 'chronic' },
  { icon: Syringe, title: 'First Aid & Wound Care', desc: 'Bandages, antiseptics, syringes and injury essentials.', grad: 'from-accent-500 to-brand-blue', slug: 'firstaid' },
  { icon: Leaf, title: 'Vitamins & Supplements', desc: 'Multivitamins, protein, immunity and wellness support.', grad: 'from-brand-green to-green-600', slug: 'vitamins' },
  { icon: Baby, title: 'Baby & Mother Care', desc: 'Baby food, diapers, and pre & post-natal products.', grad: 'from-brand-magenta to-brand-pink', slug: 'baby' },
];

const GENERAL: Cat[] = [
  { icon: Bath, title: 'Soaps & Bathing', desc: 'Bath soaps, body wash, handwash and shampoos.', grad: 'from-accent-500 to-brand-blue', slug: 'soaps' },
  { icon: Sparkles, title: 'Perfumes & Deodorants', desc: 'Perfumes, body sprays, roll-ons and fragrances.', grad: 'from-brand-magenta to-brand-pink', slug: 'perfumes' },
  { icon: Droplets, title: 'Personal & Skin Care', desc: 'Creams, lotions, oils, face wash and grooming.', grad: 'from-brand-blue to-brand-magenta', slug: 'skincare' },
  { icon: ShoppingBasket, title: 'Daily Essentials', desc: 'Snacks, beverages, staples and everyday groceries.', grad: 'from-brand-red to-orange-500', slug: 'essentials' },
  { icon: Package, title: 'Household & Cleaning', desc: 'Detergents, cleaners, disinfectants and utilities.', grad: 'from-brand-blue to-accent-600', slug: 'household' },
  { icon: Sun, title: 'Cosmetics & Grooming', desc: 'Cosmetics, hair care and daily grooming needs.', grad: 'from-brand-pink to-rose-500', slug: 'cosmetics' },
];

const FEATURES = [
  { icon: ShieldCheck, title: 'Licensed & Genuine', desc: 'Authentic products from trusted manufacturers only.' },
  { icon: Stethoscope, title: 'Expert Pharmacists', desc: 'Friendly advice and correct dosage guidance.' },
  { icon: Store, title: 'Everything Under One Roof', desc: 'Medicines and daily needs in a single trip.' },
  { icon: Clock, title: 'Open All Week', desc: 'Long hours, every day, for your convenience.' },
];

const STATS = [
  { end: 5000, suffix: '+', label: 'Products in stock' },
  { end: 15, suffix: '+', label: 'Years of trust' },
  { end: 14, suffix: ' hrs', label: 'Open every day' },
  { end: 100, suffix: '%', label: 'Genuine medicines' },
];

function CategoryCard({ icon: Icon, title, desc, grad, slug }: Cat) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="card group h-full overflow-hidden !p-0 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
      <div className={cn('relative h-36 overflow-hidden bg-gradient-to-br', grad)}>
        <div className="absolute inset-0" style={{ backgroundImage: CROSS_PATTERN }} />
        {imgOk && (
          <img
            src={`/img/${slug}.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgOk(false)}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/25 text-white ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
            <Icon className="h-8 w-8 drop-shadow" />
          </div>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-brand-blue">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const [imgOk, setImgOk] = useState(true);
  const [store, setStore] = useState<StoreInfo>(FALLBACK);

  useEffect(() => {
    let active = true;
    api
      .get('/settings/public')
      .then(({ data }) => {
        if (!active) return;
        const d = data.data as Partial<StoreInfo>;
        setStore({
          storeName: d.storeName?.trim() || FALLBACK.storeName,
          address: d.address?.trim() || FALLBACK.address,
          phone: d.phone?.trim() || FALLBACK.phone,
          email: d.email?.trim() || FALLBACK.email,
          mapEmbedUrl: d.mapEmbedUrl?.trim() || FALLBACK.mapEmbedUrl,
        });
      })
      .catch(() => {
        /* offline / not seeded — keep sensible fallbacks */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ---------- Top bar ---------- */}
      <header className="sticky top-0 z-40 border-b-4 border-brand-magenta bg-brand-yellow/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-magenta text-white shadow-sm">
              <Pill className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-extrabold text-brand-blue">Arbuda Medical</p>
              <p className="text-xs font-semibold text-brand-red">General Store · Ramseen</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 sm:gap-6">
            <a href="#products" className="text-sm font-semibold text-brand-blue transition-colors hover:text-brand-magenta">Products</a>
            <a href="#visit" className="text-sm font-semibold text-brand-blue transition-colors hover:text-brand-magenta">Visit Us</a>
          </nav>
        </div>
      </header>

      {/* ---------- Full-screen banner hero ---------- */}
      <section
        id="home"
        className="relative flex min-h-[calc(100svh-64px)] w-full flex-col items-center justify-center overflow-hidden bg-brand-yellow px-4 py-16 sm:px-6"
      >
        {/* magenta / blue corner flourishes echoing the sign's border */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-magenta/40 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-brand-blue/30 blur-3xl" />
          <div className="absolute -right-16 top-1/4 h-56 w-56 rounded-full bg-brand-pink/30 blur-3xl" />
        </div>

        <div className="relative z-10 flex w-full max-w-6xl flex-col items-center">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-brand-red px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-md">
            <Star className="h-3.5 w-3.5 fill-white text-white" /> Trusted by families in Ramseen
          </span>

          {/* the shop banner — shown full, uncropped, framed like the real sign */}
          <div className="w-full animate-scale-in rounded-2xl bg-white p-0 shadow-2xl ring-4 ring-brand-magenta sm:p-3 sm:ring-8">
            {imgOk ? (
              // <img
              //   src="/KP%20Medical.png"
              //   alt={`${store.storeName} banner`}
              //   className="h-auto w-full rounded-xl object-contain"
              //   onError={() => setImgOk(false)}
              // />
            <picture>
                <source
                  media="(max-width: 768px)"
                  srcSet="/KP_Medical_phone.jpeg"
                />

                <img
                  src="/KP%20Medical.png"
                  alt={`${store.storeName} banner`}
                  className="w-full rounded-xl object-cover"
                  onError={() => setImgOk(false)}
                />
            </picture>

            ) : (
              <div className="flex aspect-[21/9] w-full flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-brand-blue via-brand-magenta to-brand-red text-white">
                <Store className="h-20 w-20 animate-float" />
                <p className="px-8 text-center text-sm font-medium text-white/90">
                  Add your storefront banner at
                  <br />
                  <code className="text-xs">client/public/KP Medical.png</code>
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#products"
              className="group inline-flex items-center gap-3 rounded-full bg-brand-blue py-2 pl-2 pr-6 text-sm font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all hover:bg-brand-blue-dark"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" />
              </span>
              Explore Products
            </a>
            <a
              href={`tel:${store.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-red/30 transition-transform hover:scale-105"
            >
              <Phone className="h-4 w-4" /> {store.phone}
            </a>
          </div>
        </div>

        <a href="#products" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-brand-blue/70 transition-colors hover:text-brand-blue" aria-label="Scroll to products">
          <ChevronDown className="h-7 w-7 animate-float" />
        </a>
      </section>

      {/* ---------- Stats band ---------- */}
      <section className="bg-brand-blue py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="text-center text-white">
                  <p className="text-3xl font-extrabold text-brand-yellow sm:text-4xl">
                    <CountUp end={s.end} suffix={s.suffix} />
                  </p>
                  <p className="mt-1 text-xs text-white/80 sm:text-sm">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Intro / about ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-brand-blue sm:text-4xl">One store for health &amp; home</h2>
          <p className="mt-4 text-slate-500">
            We are a licensed retail pharmacy and general store serving Ramseen and the
            surrounding villages. Whether you need genuine medicines dispensed by
            qualified pharmacists, or your daily soaps, personal care and household
            supplies — we make sure you never have to make two trips.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <div className="card group h-full border-t-4 border-brand-yellow p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-magenta text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-brand-blue">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Products ---------- */}
      <section id="products" className="scroll-mt-16 bg-brand-yellow-soft/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green to-emerald-600 text-white shadow-md">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-brand-blue sm:text-3xl">Pharmacy &amp; Healthcare</h2>
              <p className="text-sm text-slate-500">All kinds of medicines and health essentials.</p>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PHARMACY.map((c, i) => (
              <Reveal key={c.title} delay={i * 70}>
                <CategoryCard {...c} />
              </Reveal>
            ))}
          </div>

          <Reveal className="mb-8 mt-16 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-magenta to-brand-pink text-white shadow-md">
              <ShoppingBasket className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-brand-blue sm:text-3xl">General Store &amp; Daily Needs</h2>
              <p className="text-sm text-slate-500">Soaps, perfumes and everyday household items.</p>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GENERAL.map((c, i) => (
              <Reveal key={c.title} delay={i * 70}>
                <CategoryCard {...c} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Visit us ---------- */}
      <section id="visit" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6">
        <Reveal className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-brand-blue sm:text-4xl">Visit us today</h2>
          <p className="mt-3 text-slate-500">Drop by the store — we&apos;re easy to find and always happy to help.</p>
        </Reveal>
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { icon: MapPin, title: 'Address', body: <p className="mt-1 text-sm text-slate-500">{store.address}</p>, grad: 'from-brand-blue to-accent-600' },
            { icon: Clock, title: 'Opening Hours', body: <p className="mt-1 text-sm text-slate-500">{HOURS}</p>, grad: 'from-brand-green to-emerald-600' },
            {
              icon: Phone, title: 'Contact', grad: 'from-brand-red to-rose-600',
              body: (
                <>
                  <a href={`tel:${store.phone.replace(/\s/g, '')}`} className="mt-1 block text-sm text-slate-500 transition-colors hover:text-brand-magenta">{store.phone}</a>
                  <a href={`mailto:${store.email}`} className="mt-0.5 flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-brand-magenta"><Mail className="h-3.5 w-3.5" /> {store.email}</a>
                </>
              ),
            },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 110}>
              <div className="card flex h-full items-start gap-4 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', c.grad)}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-brand-blue">{c.title}</h3>
                  {c.body}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* embedded store location map */}
        {store.mapEmbedUrl && (
          <Reveal className="mt-8">
            <div className="overflow-hidden rounded-3xl shadow-xl ring-4 ring-brand-yellow">
              <iframe
                src={store.mapEmbedUrl}
                title={`${store.storeName} location on Google Maps`}
                className="h-[380px] w-full border-0 sm:h-[450px]"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </Reveal>
        )}
      </section>

      {/* ---------- CTA band ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue via-brand-magenta to-brand-red p-10 text-center text-white shadow-2xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-brand-yellow/20 blur-2xl animate-blob" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-52 w-52 rounded-full bg-white/10 blur-2xl animate-blob [animation-delay:4s]" />
            <Truck className="mx-auto mb-3 h-10 w-10 animate-float" />
            <h2 className="text-2xl font-bold sm:text-3xl">Need something specific?</h2>
            <p className="mx-auto mt-2 max-w-xl text-white/90">
              Call ahead and we&apos;ll keep your medicines and daily essentials ready for pickup.
            </p>
            <a
              href={`tel:${store.phone.replace(/\s/g, '')}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-yellow px-6 py-3 text-sm font-bold text-brand-blue shadow-lg transition-transform hover:scale-105"
            >
              <Phone className="h-4 w-4" /> {store.phone}
            </a>
          </div>
        </Reveal>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t-4 border-brand-magenta bg-brand-blue">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-brand-yellow">{store.storeName}</p>
            <p className="text-sm text-white/70">{store.address}</p>
          </div>
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-brand-yellow px-5 py-2 text-sm font-semibold text-brand-blue transition-colors hover:bg-white">
              <ShieldCheck className="h-4 w-4" /> Management Portal
            </Link>
            <p className="text-xs text-white/60">© {store.storeName}. All rights reserved.</p>
            <p className="text-xs font-medium text-brand-yellow/90">Developed and maintained by Sachin Suthar</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
