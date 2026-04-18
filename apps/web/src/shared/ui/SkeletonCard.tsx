function Shimmer() {
  return (
    <div
      className="absolute inset-0 rounded-2xl"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s linear infinite',
      }}
    />
  );
}

export default function SkeletonCard() {
  return (
    <div className="relative bg-white rounded-2xl p-4 border border-slate-100 overflow-hidden">
      <Shimmer />
      <div className="w-11 h-11 bg-slate-100 rounded-xl mb-3" />
      <div className="h-3.5 bg-slate-100 rounded-lg w-3/4 mb-2" />
      <div className="h-3 bg-slate-50 rounded-lg w-1/2" />
    </div>
  );
}

export function SkeletonItemCard() {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <Shimmer />
      <div className="aspect-square bg-slate-100" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-slate-100 rounded-lg w-4/5" />
        <div className="h-3 bg-slate-50 rounded-lg w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        i % 3 === 0 ? <SkeletonCard key={i} /> : <SkeletonItemCard key={i} />
      ))}
    </div>
  );
}
