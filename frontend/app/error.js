"use client";

export default function GlobalError({ error, reset }) {
  return (
    <main className="shell">
      <div className="mx-auto max-w-3xl panel p-8">
        <div className="text-xs uppercase tracking-[0.25em] text-[#c44536]">Application Error</div>
        <h1 className="mt-3 text-3xl font-semibold text-[#14213d]">The dashboard hit an unexpected problem.</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f6b7a]">
          {error?.message ?? "An unknown error occurred while rendering the dashboard."}
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-xl bg-[#14213d] px-4 py-3 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
