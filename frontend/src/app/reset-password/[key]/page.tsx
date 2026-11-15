import { AuthLayout } from "@/features/accounts/auth-layout";
import { ResetPasswordForm } from "@/features/accounts/reset-password-form";

// The link in the password reset email points here (HEADLESS_FRONTEND_URLS in Django settings).
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return (
    <AuthLayout>
      <ResetPasswordForm resetKey={key} />
    </AuthLayout>
  );
}
