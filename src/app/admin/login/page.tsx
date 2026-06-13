import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectedFrom?: string; error?: string }>;
}) {
  const { redirectedFrom, error } = await searchParams;

  const initialError =
    error === "not_admin"
      ? "That account is not authorized for the admin dashboard."
      : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-700">Zooz Treats</h1>
          <p className="mt-1 text-sm text-gray-500">Admin sign in</p>
        </div>
        <div className="admin-card p-6">
          <LoginForm
            redirectTo={redirectedFrom ?? "/admin"}
            initialError={initialError}
          />
        </div>
      </div>
    </main>
  );
}
