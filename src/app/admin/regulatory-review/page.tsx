import AdminLoginForm from "@/app/admin/search-history/AdminLoginForm";
import AdminRegulatoryReviewDashboard from "@/app/admin/regulatory-review/AdminRegulatoryReviewDashboard";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminRegulatoryReviewPage() {
  if (!isAdminConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">관리자 설정 필요</h1>
        <p className="mt-3 text-sm text-slate-600">
          Vercel 환경변수 <code className="rounded bg-slate-100 px-1">ADMIN_PASSWORD</code>를 설정한
          뒤 다시 접속해 주세요.
        </p>
      </div>
    );
  }

  const authed = await isAdminAuthenticated();
  if (!authed) {
    return <AdminLoginForm redirectPath="/admin/regulatory-review" />;
  }

  return <AdminRegulatoryReviewDashboard />;
}
