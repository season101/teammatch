import { AuthLayout } from "@/features/accounts/auth-layout";
import { GoogleCallback } from "@/features/accounts/google-callback";

export default async function GoogleCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <AuthLayout>
      <GoogleCallback error={error} next={next} />
    </AuthLayout>
  );
}
