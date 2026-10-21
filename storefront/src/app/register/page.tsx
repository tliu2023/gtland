import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { register } from "../auth-actions";

const inputClass =
  "rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);

  if (params.sent) {
    return (
      <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
        <main className="mx-auto max-w-sm px-6 py-16">
          <h1 className="mb-4 text-2xl font-semibold text-black dark:text-zinc-50">Check your email</h1>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            We sent a verification link to the email you signed up with. Click it to activate your account,
            then log in. The link expires in 3 days.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Didn&apos;t get it?{" "}
            <Link href="/resend-verification" className="font-medium text-black underline dark:text-zinc-50">
              Resend the link
            </Link>
            {" \u00b7 "}
            <Link
              href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`}
              className="font-medium text-black underline dark:text-zinc-50"
            >
              Log in
            </Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">Create an account</h1>

        {params.error && (
          <p className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {params.error}
          </p>
        )}

        <form action={register} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <label className={labelClass}>
            Username
            <input name="username" required maxLength={150} autoComplete="username" className={inputClass} />
          </label>
          <label className={labelClass}>
            Email
            <input type="email" name="email" required autoComplete="email" className={inputClass} />
          </label>
          <label className={labelClass}>
            Password
            <input type="password" name="password1" required autoComplete="new-password" className={inputClass} />
          </label>
          <label className={labelClass}>
            Confirm password
            <input type="password" name="password2" required autoComplete="new-password" className={inputClass} />
          </label>
          <button
            type="submit"
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Sign up
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`}
            className="font-medium text-black underline dark:text-zinc-50"
          >
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}
