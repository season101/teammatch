import { AuthForm } from "@/features/accounts/auth-form";
import { AuthLayout } from "@/features/accounts/auth-layout";

// The same screen as /login; the password step opens on Create account.
export default function SignUpPage() {
  return (
    <AuthLayout>
      <AuthForm start="signup" />
    </AuthLayout>
  );
}
