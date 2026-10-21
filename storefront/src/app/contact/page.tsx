import { redirect } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { sendContactMessage } from "@/lib/mail";

// inquiries reference live product data, and status (success/error) comes via query params
export const dynamic = "force-dynamic";

async function submitInquiry(formData: FormData) {
  "use server";

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";
  const productSlug = (formData.get("productSlug") as string | null) || undefined;
  const productTitle = (formData.get("productTitle") as string | null) || undefined;

  const params = new URLSearchParams();
  if (productSlug) params.set("product", productSlug);

  if (!name || !email || !message) {
    params.set("error", "All fields are required.");
    redirect(`/contact?${params.toString()}`);
  }

  try {
    await sendContactMessage({ name, email, message, productSlug, productTitle });
  } catch (err) {
    console.error("Failed to send contact message", err);
    params.set(
      "error",
      "Something went wrong sending your message. Please try again or email us directly.",
    );
    redirect(`/contact?${params.toString()}`);
  }

  params.set("success", "1");
  redirect(`/contact?${params.toString()}`);
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const product = params.product ? await getProductBySlug(params.product) : null;
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">
          Contact us
        </h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Interested in an item, have a question, or want to make an offer? Send us a
          message and we&apos;ll get back to you.
          {contactEmail && <> You can also email us directly at {contactEmail}.</>}
        </p>

        {product && (
          <p className="mb-6 rounded border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Regarding: <span className="font-medium">{product.title}</span>
          </p>
        )}

        {params.success && (
          <p className="mb-6 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            Thanks! Your message has been sent. We&apos;ll get back to you soon.
          </p>
        )}
        {params.error && (
          <p className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {params.error}
          </p>
        )}

        <form action={submitInquiry} className="flex flex-col gap-4">
          {product && (
            <>
              <input type="hidden" name="productSlug" value={product.slug} />
              <input type="hidden" name="productTitle" value={product.title} />
            </>
          )}
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Name
            <input
              type="text"
              name="name"
              required
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Message
            <textarea
              name="message"
              required
              rows={5}
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Send message
          </button>
        </form>
      </main>
    </div>
  );
}
