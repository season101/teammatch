import { AuthLayout } from "@/features/accounts/auth-layout";
import { GoogleButton } from "@/features/accounts/google-button";
import { SignUpForm } from "@/features/accounts/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUpForm google={<GoogleButton />} />
    </AuthLayout>
  );
}
