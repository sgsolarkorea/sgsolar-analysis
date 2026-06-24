import { redirect } from "next/navigation";
import AnalysisLoadingScreen from "@/components/home/AnalysisLoadingScreen";
import { DEFAULT_ADDRESS } from "@/data/sampleData";

interface AnalyzingPageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function AnalyzingPage({ searchParams }: AnalyzingPageProps) {
  const params = await searchParams;
  const address = params.address?.trim() || DEFAULT_ADDRESS;

  if (!address) {
    redirect("/");
  }

  return (
    <section className="min-h-[60vh] bg-slate-50">
      <AnalysisLoadingScreen address={address} />
    </section>
  );
}
