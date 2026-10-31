import { AuthLayout } from "@/features/accounts/auth-layout";
import { GoogleButton } from "@/features/accounts/google-button";
import { SignInForm } from "@/features/accounts/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <AuthLayout>
      <SignInForm
        next={next}
        google={<GoogleButton next={next} />}
        googleError={error}
      />
    </AuthLayout>
  );
}
