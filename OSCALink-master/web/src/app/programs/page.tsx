import { TopNavBar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { createServerClient as createClient } from "@/lib/supabase-server";
import { ProgramsClient } from "./programs-client";

type NewsItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  publish_date: string | null;
  source_level: string | null;
};

async function getPrograms(): Promise<NewsItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('news')
    .select('id, title, content, category, publish_date, source_level')
    .eq('is_published', true)
    .order('publish_date', { ascending: false });

  return (data || []) as NewsItem[];
}

export default async function ProgramsPage() {
  const programs = await getPrograms();

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />
      <main className="flex-1 pt-20 bg-surface-lowest">
        <div className="max-w-[1440px] mx-auto px-6 py-12">
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-foreground">
              Programs & Events
            </h1>
            <p className="text-slate-400 mt-3 text-lg">
              Stay updated with the latest programs, activities, and announcements for senior citizens
            </p>
          </div>

          <ProgramsClient programs={programs} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
