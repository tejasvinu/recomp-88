import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-canvas text-neutral-200 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/8 bg-neutral-950/70 p-8 text-center">
        <p className="text-caption font-black uppercase tracking-[0.24em] text-accent-400">404</p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.12em] text-white">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-neutral-500 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-accent-400 px-5 py-3 text-xs font-black uppercase tracking-widest text-neutral-950 transition-colors hover:bg-accent-300"
        >
          Back To Tracker
        </Link>
      </div>
    </main>
  );
}
