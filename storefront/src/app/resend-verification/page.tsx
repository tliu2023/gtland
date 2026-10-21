import Link from "next/link";
import { resendVerification } from "../auth-actions";

const inputClass =
  "rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

export default async function ResendVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-sm px-6 py-16">
        <Link href="/login" className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          {"\u2190"} Back to log in
        </Link>
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">Resend verification email</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Enter the email you signed up with and we&apos;ll send a new verification link.
        </p>

        {params.sent && (
          <p className="mb-6 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            If an unverified account exists for that email, a new link has been sent. Check your inbox.
          </p>
        )}
        {params.error && (
          <p className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {params.error}
          </p>
        )}

        <form action={resendVerification} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Email
            <input type="email" name="email" required autoComplete="email" className={inputClass} />
          </label>
          <button
            type="submit"
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Send link
          </button>
        </form>
      </main>
    </div>
  );
}
