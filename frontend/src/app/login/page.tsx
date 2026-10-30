import { GoogleButton } from "@/features/accounts/google-button";
import { SignInForm } from "@/features/accounts/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <SignInForm next={next} google={<GoogleButton />} googleError={error} />
    </main>
  );
}
