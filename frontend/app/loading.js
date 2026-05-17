export default function Loading() {
  return (
    <main className="shell">
      <div className="mx-auto max-w-5xl panel p-8">
        <div className="text-xs uppercase tracking-[0.25em] text-[#2a9d8f]">Loading</div>
        <h1 className="mt-3 text-3xl font-semibold text-[#14213d]">Preparing the traffic correlation dashboard</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-3xl border border-[rgba(20,33,61,0.08)] bg-white/70"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
