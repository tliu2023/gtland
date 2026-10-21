import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { login } from "../auth-actions";

const inputClass =
  "rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; verified?: string; unverified?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">Log in</h1>

        {params.verified && (
          <p className="mb-6 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            Your email is verified. You can log in now.
          </p>
        )}
        {params.unverified && (
          <p className="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Please verify your email before logging in. Check your inbox for the link, or{" "}
            <Link href="/resend-verification" className="font-medium underline">
              resend it
            </Link>
            .
          </p>
        )}

        {params.error && (
          <p className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {params.error}
          </p>
        )}

        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <label className={labelClass}>
            Username
            <input name="username" required autoComplete="username" className={inputClass} />
          </label>
          <label className={labelClass}>
            Password
            <input type="password" name="password" required autoComplete="current-password" className={inputClass} />
          </label>
          <button
            type="submit"
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Log in
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          No account?{" "}
          <Link
            href={next === "/" ? "/register" : `/register?next=${encodeURIComponent(next)}`}
            className="font-medium text-black underline dark:text-zinc-50"
          >
            Sign up
          </Link>
        </p>
      </main>
    </div>
  );
}
