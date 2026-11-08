import { AuthLayout } from "@/features/accounts/auth-layout";
import { ForgotPasswordForm } from "@/features/accounts/forgot-password-form";

// "Forgot password?" on sign-in opens this, and so does the link in the
// "you already have an account" email (HEADLESS_FRONTEND_URLS in Django settings).
export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
