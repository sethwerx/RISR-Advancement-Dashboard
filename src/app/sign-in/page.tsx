import { allowedEmailDomain } from "@/lib/access";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  const domain = allowedEmailDomain();
  const blocked = params.error === "domain";
  const organizer = params.error === "organizer";
  return (
    <section className="mx-auto max-w-lg rounded-lg border border-[#d5dee8] bg-white px-6 py-8">
      <h1 className="font-title text-5xl leading-none text-navy-900">Sign in</h1>
      <p className="mt-3 text-sm text-[#3e556c]">
        This dashboard is only for Google accounts at {domain}. Use your school account.
      </p>
      {blocked ? (
        <p className="mt-3 rounded bg-[#f8e8e6] px-3 py-2 text-sm text-[#8d2f2f]">
          That Google account is not a {domain} account.
        </p>
      ) : null}
      {organizer ? (
        <p className="mt-3 rounded bg-[#f8e8e6] px-3 py-2 text-sm text-[#8d2f2f]">
          The admissions connection must be signed in as the organizer account.
        </p>
      ) : null}
      <a
        className="mt-6 inline-block rounded bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
        href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
      >
        Sign in with Google
      </a>
    </section>
  );
}
