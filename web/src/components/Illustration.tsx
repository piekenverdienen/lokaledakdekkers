// Eigen illustraties per onderwerp. Vaste stijl: navy lucht, amber accent, witte lijnen. Geen externe afbeeldingen.
const C = { navy: "#142E3A", blue: "#176E96", sky: "#E8EEE9", amber: "#C76B46", amberD: "#C97A0F", white: "#FFFFFF", ink: "#13202B", green: "#1B6B3A", grey: "#C2D1DB", red: "#B23A3A" };

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 800 420" width="100%" role="img" aria-label={label} style={{ display: "block", borderRadius: 16, background: C.sky }}>
      <defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D6E6F1" /><stop offset="1" stopColor={C.sky} /></linearGradient></defs>
      <rect width="800" height="420" fill="url(#skyg)" />
      <circle cx="660" cy="90" r="34" fill={C.amber} opacity="0.9" />
      {children}
    </svg>
  );
}
const House = ({ x = 180, y = 150, w = 440, roof = C.navy, wall = C.white }: { x?: number; y?: number; w?: number; roof?: string; wall?: string }) => (
  <g>
    <rect x={x + 30} y={y + 110} width={w - 60} height="150" fill={wall} stroke={C.grey} />
    <path d={`M${x} ${y + 120} L${x + w / 2} ${y} L${x + w} ${y + 120} Z`} fill={roof} />
    <rect x={x + 70} y={y + 150} width="60" height="70" fill={C.blue} opacity="0.8" />
    <rect x={x + w - 130} y={y + 150} width="60" height="70" fill={C.blue} opacity="0.8" />
    <rect x={x + w / 2 - 28} y={y + 190} width="56" height="70" fill={C.navy} />
    <rect x="0" y="330" width="800" height="90" fill="#CFE0C4" />
  </g>
);
const Flat = ({ cover = C.navy, label }: { cover?: string; label?: string }) => (
  <g>
    <rect x="0" y="330" width="800" height="90" fill="#CFE0C4" />
    <rect x="200" y="190" width="400" height="140" fill={C.white} stroke={C.grey} />
    <rect x="190" y="170" width="420" height="22" fill={cover} />
    <rect x="190" y="164" width="420" height="8" fill={C.amberD} />
    <rect x="250" y="230" width="60" height="70" fill={C.blue} opacity="0.8" />
    <rect x="490" y="230" width="60" height="70" fill={C.blue} opacity="0.8" />
    {label && <text x="400" y="150" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="22" fill={C.navy}>{label}</text>}
  </g>
);
const Person = ({ x, y }: { x: number; y: number }) => (
  <g>
    <circle cx={x} cy={y} r="14" fill={C.amber} />
    <rect x={x - 14} y={y + 14} width="28" height="40" rx="6" fill={C.blue} />
    <rect x={x - 12} y={y - 30} width="24" height="16" rx="4" fill={C.amberD} />
  </g>
);

export default function Illustration({ kind }: { kind: string }) {
  switch (kind) {
    case "epdm":
      return (<Frame label="Plat dak met EPDM-folie"><Flat cover="#2F3A44" label="EPDM" /><g><rect x="330" y="120" width="140" height="44" rx="22" fill="#2F3A44" /><circle cx="330" cy="142" r="22" fill="#4A5661" /><circle cx="330" cy="142" r="8" fill={C.white} /></g><Person x={560} y={130} /></Frame>);
    case "bitumen":
      return (<Frame label="Bitumen dakbedekking branden"><Flat cover="#3B3B3B" label="Bitumen" /><rect x="300" y="128" width="120" height="36" rx="18" fill="#3B3B3B" /><Person x={500} y={130} /><path d="M470 160 l40 10" stroke={C.ink} strokeWidth="6" strokeLinecap="round" /><path d="M510 170 q10 -14 22 -2 q-8 10 -22 2z" fill={C.amberD} /><path d="M512 168 q8 -8 16 0 q-6 6 -16 0z" fill={C.amber} /></Frame>);
    case "dakbedekking":
      return (<Frame label="Drie soorten dakbedekking naast elkaar"><rect x="0" y="330" width="800" height="90" fill="#CFE0C4" /><g>{["Bitumen", "EPDM", "PVC"].map((t, i) => (<g key={t}><rect x={90 + i * 230} y="200" width="180" height="130" fill={C.white} stroke={C.grey} /><rect x={84 + i * 230} y="184" width="192" height="18" fill={["#3B3B3B", "#2F3A44", "#7A8D9B"][i]} /><text x={180 + i * 230} y="170" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="20" fill={C.navy}>{t}</text></g>))}</g></Frame>);
    case "dakkapel":
      return (<Frame label="Dakkapel op een pannendak"><House /><rect x="330" y="120" width="140" height="80" fill={C.white} stroke={C.grey} /><rect x="322" y="112" width="156" height="12" fill={C.navy} /><rect x="345" y="135" width="40" height="55" fill={C.blue} opacity="0.8" /><rect x="415" y="135" width="40" height="55" fill={C.blue} opacity="0.8" /><text x="400" y="100" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="20" fill={C.navy}>3 tot 6 meter</text></Frame>);
    case "pannendak":
      return (<Frame label="Pannendak met nieuwe dakpannen"><House roof="#9B4A2F" /><g stroke="#7E3A24" strokeWidth="2" fill="none">{[0, 1, 2, 3, 4].map((r) => <path key={r} d={`M${230 + r * 20} ${260 - r * 22} L${400 - r * 0} ${150 + r * 0}`} opacity="0" />)}{[1, 2, 3, 4, 5].map((r) => <path key={r} d={`M${180 + r * 30} ${270 - r * 24} L${620 - r * 30} ${270 - r * 24}`} />)}</g><g><rect x="560" y="100" width="90" height="60" rx="6" fill={C.white} stroke={C.grey} /><rect x="568" y="108" width="74" height="44" fill="#9B4A2F" /></g><Person x={150} y={250} /></Frame>);
    case "platdak":
      return (<Frame label="Plat dak vervangen"><Flat cover="#2F3A44" /><g><rect x="60" y="180" width="110" height="150" fill={C.grey} /><rect x="60" y="170" width="110" height="12" fill={C.amberD} /><text x="115" y="155" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="18" fill={C.navy}>oud</text><text x="400" y="150" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="22" fill={C.navy}>nieuw, per m2</text></g><Person x={660} y={250} /></Frame>);
    case "lekkage":
      return (<Frame label="Daklekkage met druppels"><House /><path d="M470 160 q-10 30 0 60" stroke={C.blue} strokeWidth="4" fill="none" strokeLinecap="round" /><g fill={C.blue}>{[0, 1, 2].map((i) => <path key={i} d={`M${470} ${240 + i * 30} q-8 12 0 18 q8 -6 0 -18z`} />)}</g><g><rect x="420" y="300" width="100" height="26" rx="6" fill={C.amber} /><text x="470" y="318" textAnchor="middle" fontFamily="Source Sans 3, sans-serif" fontWeight="600" fontSize="14" fill={C.ink}>emmer</text></g><path d="M520 60 l-30 50 h20 l-24 50" stroke={C.amberD} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Frame>);
    case "isolatie":
      return (<Frame label="Dakisolatie in lagen"><rect x="0" y="330" width="800" height="90" fill="#CFE0C4" /><g>{[["Dakpannen", "#9B4A2F"], ["Folie", C.white], ["Isolatie", C.amber], ["Dakbeschot", "#D9B38C"], ["Binnenkant", C.sky]].map(([t, c], i) => (<g key={t}><rect x="200" y={130 + i * 40} width="400" height="36" fill={c} stroke={C.grey} /><text x="190" y={154 + i * 40} textAnchor="end" fontFamily="Source Sans 3, sans-serif" fontWeight="600" fontSize="16" fill={C.navy}>{t}</text></g>))}</g><path d="M650 140 v180" stroke={C.red} strokeWidth="4" /><path d="M640 300 l10 20 l10 -20" fill={C.red} /><text x="690" y="230" fontFamily="Source Sans 3, sans-serif" fontSize="14" fill={C.navy}>warmte blijft binnen</text></Frame>);
    case "kosten":
      return (<Frame label="Offerte met euroteken"><House /><g><rect x="520" y="140" width="200" height="170" rx="10" fill={C.white} stroke={C.grey} /><rect x="540" y="165" width="120" height="10" rx="5" fill={C.grey} /><rect x="540" y="190" width="160" height="10" rx="5" fill={C.grey} /><rect x="540" y="215" width="100" height="10" rx="5" fill={C.grey} /><rect x="540" y="255" width="160" height="34" rx="8" fill={C.navy} /><text x="620" y="279" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="20" fill={C.amber}>per m2</text></g></Frame>);
    case "inspectie":
      return (<Frame label="Dakinspectie met ladder en checklist"><House /><g stroke={C.amberD} strokeWidth="8" strokeLinecap="round"><path d="M140 330 L220 180" /><path d="M170 330 L250 180" />{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${152 + i * 15} ${305 - i * 28} L${182 + i * 15} ${305 - i * 28}`} />)}</g><Person x={265} y={150} /><g><rect x="560" y="200" width="150" height="110" rx="10" fill={C.white} stroke={C.grey} />{[0, 1, 2].map((i) => (<g key={i}><rect x="575" y={218 + i * 28} width="18" height="18" rx="4" fill={C.green} /><path d={`M579 ${227 + i * 28} l4 4 l8 -8`} stroke={C.white} strokeWidth="2.5" fill="none" /><rect x="602" y={222 + i * 28} width="90" height="10" rx="5" fill={C.grey} /></g>))}</g></Frame>);
    case "betrouwbaar":
      return (<Frame label="Schild met vinkje boven een huis"><House /><g><path d="M400 40 l50 22 v40 c0 36 -22 58 -50 70 c-28 -12 -50 -34 -50 -70 v-40z" fill={C.green} /><path d="M378 108 l16 16 l30 -34" stroke={C.white} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g></Frame>);
    default:
      return (<Frame label="Dak"><House /></Frame>);
  }
}
