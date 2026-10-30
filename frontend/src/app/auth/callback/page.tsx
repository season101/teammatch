import { GoogleCallback } from "@/features/accounts/google-callback";

export default async function GoogleCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <GoogleCallback error={error} />
    </main>
  );
}
