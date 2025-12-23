import { HtmlFetcher } from "@/components/html-fetcher";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="container mx-auto px-4 py-12">
        <HtmlFetcher />
      </main>
    </div>
  );
}
