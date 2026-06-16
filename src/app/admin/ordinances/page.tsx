import AdminLoginForm from "@/app/admin/search-history/AdminLoginForm";
import AdminOrdinanceDashboard from "@/app/admin/ordinances/AdminOrdinanceDashboard";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin/auth";
import { listOrdinanceAdminRows } from "@/lib/ordinanceLearning/registry";
import { buildSearchDashboardStats } from "@/lib/ordinanceLearning/stats";

export const dynamic = "force-dynamic";

export default async function AdminOrdinancesPage() {
  if (!isAdminConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">관리자 설정 필요</h1>
        <p className="mt-3 text-sm text-slate-600">
          Vercel 환경변수 <code className="rounded bg-slate-100 px-1">ADMIN_PASSWORD</code>를 설정한 뒤
          다시 접속해 주세요.
        </p>
      </div>
    );
  }

  const authed = await isAdminAuthenticated();
  if (!authed) {
    return <AdminLoginForm redirectPath="/admin/ordinances" />;
  }

  const [rows, stats] = await Promise.all([listOrdinanceAdminRows(), buildSearchDashboardStats()]);
  return <AdminOrdinanceDashboard rows={rows} stats={stats} />;
}
