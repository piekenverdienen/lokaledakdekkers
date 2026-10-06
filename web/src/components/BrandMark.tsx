// Beeldmerk "de buurtlijn": drie aangrenzende daklijnen, de middelste in terracotta.
export default function BrandMark({ size = 28, mono }: { size?: number; mono?: "dark" | "light" }) {
  const ink = mono === "light" ? "#FFFFFF" : "#142E3A"; const accent = mono ? ink : "#C76B46";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <path d="M2 30l9-10 9 10" stroke={ink} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 28l9-12 9 12" stroke={accent} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 30l9-10 9 10" stroke={ink} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 38h36" stroke={ink} strokeWidth="3" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}
