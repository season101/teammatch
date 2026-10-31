import { AuthLayout } from "@/features/accounts/auth-layout";
import { VerifyEmail } from "@/features/accounts/verify-email";

// The link in the verification email points here (HEADLESS_FRONTEND_URLS in Django settings).
export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return (
    <AuthLayout>
      <VerifyEmail verificationKey={key} />
    </AuthLayout>
  );
}
