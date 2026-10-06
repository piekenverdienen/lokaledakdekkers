// Subtiel grafisch accent: de buurtlijn uit het beeldmerk als doorlopende daklijn.
export default function Roofline({ color = "#D8DFDC", accent = "#C76B46", height = 28 }: { color?: string; accent?: string; height?: number }) {
  const w = 1200, seg = 60; const pts: string[] = [];
  for (let x = 0; x <= w; x += seg) pts.push(`${x},${height - 4} ${x + seg / 2},4`);
  return (
    <svg className="roofline" viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polyline points={pts.join(" ") + ` ${w},${height - 4}`} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <polyline points={`${w / 2 - seg},${height - 4} ${w / 2 - seg / 2},4 ${w / 2},${height - 4}`} fill="none" stroke={accent} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
