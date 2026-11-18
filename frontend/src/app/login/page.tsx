import { AuthForm } from "@/features/accounts/auth-form";
import { AuthLayout } from "@/features/accounts/auth-layout";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <AuthLayout>
      <AuthForm next={next} googleError={error} />
    </AuthLayout>
  );
}
