import { SignInForm } from "@/features/accounts/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <SignInForm next={next} />
    </main>
  );
}
