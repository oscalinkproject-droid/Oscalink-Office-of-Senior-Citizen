import { TopNavBar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { DownloadButton } from "@/components/ui/download-button";
import { NewsCarousel } from "@/components/ui/news-carousel";
import { COTABATO_BARANGAYS } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase-server";

type NewsItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  publish_date: string | null;
};

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'fb-1', title: 'Quarterly Registration Deadline',
    content: 'All senior citizens are reminded to update their records before Q2 deadline. Visit your barangay hall for verification.',
    category: 'Alert', publish_date: '2026-03-15',
  },
  {
    id: 'fb-2', title: 'New PhilHealth Coverage',
    content: 'All registered seniors are now automatically enrolled in PhilHealth. Check your status at the OSCA office.',
    category: 'News', publish_date: '2026-03-05',
  },
  {
    id: 'fb-3', title: 'Senior Citizens Week Celebration',
    content: 'Join the citywide celebration with free health screenings, games, and raffle prizes for all registered seniors.',
    category: 'Announcement', publish_date: '2026-02-20',
  },
  {
    id: 'fb-4', title: 'Digital Literacy Workshop',
    content: 'Free training on using smartphones and the OSCALink mobile app. Open to all senior citizens.',
    category: 'Activity', publish_date: '2026-02-10',
  },
];

async function getLatestNews(): Promise<NewsItem[]> {
  const supabase = await createAdminClient();
  if (!supabase) {
    console.warn('[landing] createAdminClient returned null — SUPABASE_SERVICE_ROLE_KEY missing or placeholder. Using fallback news.');
    return FALLBACK_NEWS;
  }

  const { data } = await supabase
    .from('news')
    .select('id, title, content, category, publish_date')
    .eq('is_published', true)
    .order('publish_date', { ascending: false })
    .limit(6);

  if (!data || data.length === 0) return FALLBACK_NEWS.slice(0, 6);
  return data as NewsItem[];
}

async function getLandingStats() {
  const supabase = await createAdminClient();
  if (!supabase) {
    console.warn('[landing] createAdminClient returned null — SUPABASE_SERVICE_ROLE_KEY missing or placeholder. Stats will show 0.');
    return { seniorCount: '0', activeCount: '0' };
  }

  const { count: totalSeniors } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true });

  const { count: activeSeniors } = await supabase
    .from('seniors')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Active');

  const formatNumber = (n: number) => n.toLocaleString('en-PH');

  return {
    seniorCount: formatNumber(totalSeniors || 0),
    activeCount: formatNumber(activeSeniors || 0),
  };
}

export default async function Home() {
  const { seniorCount, activeCount } = await getLandingStats();
  const news = await getLatestNews();

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />
      
      <main className="flex-1 pt-16 relative mesh-gradient min-h-screen">
        {/* Global Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
          <div className="absolute top-[60%] left-[60%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px]" />
        </div>
        
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 overflow-hidden">
          <div className="max-w-5xl w-full text-center z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-highest border border-outline-variant/30 text-primary font-label text-xs tracking-widest uppercase shadow-lg shadow-primary/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              OSCALink Cotabato City
            </div>
            
            <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tighter text-foreground leading-[0.95] text-balance">
              Digital Governance for Our <span className="text-primary italic">Senior Citizens</span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-outline text-lg md:text-xl leading-relaxed">
              The official institutional portal for senior citizen registration, ID management, and record keeping in the Office for Senior Citizen Affairs.
            </p>
          </div>

          {/* Stats Preview */}
          <div className="w-full max-w-4xl mx-auto mt-16 grid grid-cols-3 gap-6 px-6">
            {[
              { value: seniorCount, label: "Registered Seniors" },
              { value: String(COTABATO_BARANGAYS.length), label: "Barangays" },
              { value: activeCount, label: "Active Seniors" },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-xl bg-surface-lowest shadow-sm border border-outline-variant/30">
                <p className="text-2xl md:text-3xl font-headline font-bold text-primary">{stat.value}</p>
                <p className="text-[10px] text-outline uppercase tracking-widest mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mobile App Promotion Section */}
        <section className="relative py-20 px-6 overflow-hidden">
          <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center gap-12">
            {/* App Info */}
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                Now Available
              </div>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-foreground leading-tight">
                OSCALink <span className="text-primary italic">Mobile</span>
              </h2>
              <p className="text-outline text-lg leading-relaxed max-w-xl">
                View your digital OSCA ID, digitally acknowledge your terms, and receive real-time updates — designed specifically for Cotabato City senior citizens.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {[
                  { icon: "badge", text: "Digital OSCA ID" },
                  { icon: "draw", text: "Digital Acknowledgment" },
                  { icon: "notifications_active", text: "Real-time Updates" },
                  { icon: "touch_app", text: "Senior-Friendly UI" }
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-lg">{feature.icon}</span>
                    </div>
                    <span className="text-foreground font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="pt-8">
                <DownloadButton />
              </div>
            </div>

            {/* Visual Element */}
            <div className="flex-1 relative">
              <div className="relative z-10 p-1 bg-surface-lowest rounded-[2.5rem] border border-outline-variant/30 shadow-2xl">
                <div className="bg-surface-low rounded-[2.2rem] p-8 aspect-[9/16] max-w-[320px] mx-auto flex flex-col items-center justify-center space-y-6">
                  <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-5xl">smart_display</span>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="h-2 w-24 bg-primary/20 rounded-full mx-auto" />
                    <div className="h-2 w-32 bg-surface-highest rounded-full mx-auto" />
                    <div className="h-2 w-20 bg-surface-highest rounded-full mx-auto" />
                  </div>
                  <div className="w-full space-y-3 pt-8">
                    <div className="h-10 w-full bg-primary/10 rounded-xl border border-primary/20" />
                    <div className="h-10 w-full bg-surface-highest rounded-xl" />
                    <div className="h-10 w-full bg-surface-highest rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/10 rounded-full blur-[100px] -z-10" />
            </div>
          </div>
        </section>

        {/* News & Activities Section */}
        <section className="py-24 px-6 bg-surface-low/80 backdrop-blur-sm border-y border-white/5">
          <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-foreground">
              News & Activities
            </h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              Latest updates on programs, events, and important announcements for senior citizens
            </p>
          </div>

          <NewsCarousel items={news} />

          <div className="text-center mt-10">
            <a
              href="/programs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm hover:bg-primary/20 transition-all"
            >
              View all programs & events
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </a>
          </div>
          </div>
        </section>

        {/* Downloads Section */}
        <section className="py-24 px-6 bg-surface-low/80 backdrop-blur-sm border-y border-white/5">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-foreground">
                Downloads & Forms
              </h2>
              <p className="text-slate-400 mt-3">
                Official forms and documents for senior citizen services
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <a href="#" className="flex items-center gap-4 p-6 rounded-xl bg-surface-high/50 border border-white/5 hover:border-primary/30 transition-colors cursor-pointer text-left no-underline">
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-400">description</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">PhilHealth PMRF Form</p>
                  <p className="text-xs text-slate-400">PhilHealth Member Registration Form</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">download</span>
              </a>

              <a href="#" className="flex items-center gap-4 p-6 rounded-xl bg-surface-high/50 border border-white/5 hover:border-primary/30 transition-colors cursor-pointer text-left no-underline">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-300">badge</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">ID Application</p>
                  <p className="text-xs text-slate-400">Senior Citizen ID Registration</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">download</span>
              </a>
            </div>
          </div>
        </section>

        {/* Government Links Section */}
        <section className="py-24 px-6 bg-background/30 backdrop-blur-sm">
          <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-foreground">
              Government Resources
            </h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              Official links to national agencies and support services
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="https://philhealth.gov.ph" target="_blank" rel="noopener noreferrer" className="group p-6 rounded-xl bg-surface-low border border-white/5 hover:border-primary/30 transition-all text-center">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-emerald-300">health_and_safety</span>
              </div>
              <p className="text-xs font-bold text-foreground">PhilHealth</p>
            </a>

            <a href="https://sss.gov.ph" target="_blank" rel="noopener noreferrer" className="group p-6 rounded-xl bg-surface-low border border-white/5 hover:border-primary/30 transition-all text-center">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-blue-300">savings</span>
              </div>
              <p className="text-xs font-bold text-foreground">SSS</p>
            </a>

            <a href="https://gsis.gov.ph" target="_blank" rel="noopener noreferrer" className="group p-6 rounded-xl bg-surface-low border border-white/5 hover:border-primary/30 transition-all text-center">
              <div className="w-12 h-12 rounded-lg bg-slate-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-slate-400">account_balance_wallet</span>
              </div>
              <p className="text-xs font-bold text-foreground">GSIS</p>
            </a>

            <a href="https://dilg.gov.ph" target="_blank" rel="noopener noreferrer" className="group p-6 rounded-xl bg-surface-low border border-white/5 hover:border-primary/30 transition-all text-center">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-amber-300">account_balance</span>
              </div>
              <p className="text-xs font-bold text-foreground">DILG</p>
            </a>

            <a href="https://ncsca.gov.ph" target="_blank" rel="noopener noreferrer" className="group p-6 rounded-xl bg-surface-low border border-white/5 hover:border-primary/30 transition-all text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary">groups</span>
              </div>
              <p className="text-xs font-bold text-foreground">OSCA National</p>
            </a>
          </div>
          </div>
        </section>

        {/* Institutional Hotlines */}
        <section className="py-24 px-6 bg-surface-low/80 backdrop-blur-sm border-y border-white/5">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-foreground">
                Institutional Hotlines
              </h2>
              <p className="text-slate-400 mt-3">
                For public inquiries and assistance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="flex items-center gap-4 p-6 rounded-xl bg-surface-high/50 border border-white/5">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">phone</span>
                </div>
                <div>
                  <p className="font-bold text-foreground">OSCA Main Office</p>
                  <p className="text-sm text-slate-400">(064) 421-1234</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 rounded-xl bg-surface-high/50 border border-white/5">
                <div className="w-12 h-12 rounded-lg bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary">support_agent</span>
                </div>
                <div>
                  <p className="font-bold text-foreground">Public Assistance</p>
                  <p className="text-sm text-slate-400">(064) 421-9012</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-24 px-6 bg-background/50 backdrop-blur-sm">
          <div className="max-w-[1440px] mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-headline font-extrabold tracking-tight text-foreground mb-6">
                About OSCALink
              </h2>
              <p className="text-slate-400 leading-relaxed">
                OSCALink (Office for Senior Citizen Affairs Information System) is a digital initiative 
                by the City Government of Cotabato City to modernize senior citizen registration, ID management, 
                and record keeping for our elderly population across all 37 barangays.
              </p>
              <div className="mt-8 pt-8 border-t border-white/5">
                <p className="text-sm text-slate-400">
                  © {new Date().getFullYear()} OSCALink Cotabato City. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
