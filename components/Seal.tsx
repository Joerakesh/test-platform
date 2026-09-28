// @ts-nocheck
const STARS = 28;

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export default function Seal({ size = "md", className = "" }: any) {
  const sizeClass = size === "xl" ? "seal-xl" : size === "lg" ? "seal-lg" : "seal";
  return (
    <svg
      className={`${sizeClass} ${className}`.trim()}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Government High School Palayanur emblem"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sealRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6223c" />
          <stop offset="100%" stopColor="#7a1020" />
        </linearGradient>
        <linearGradient id="sealGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd24d" />
          <stop offset="100%" stopColor="#c9962c" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="48" fill="url(#sealRed)" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="url(#sealGold)" strokeWidth="2" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#ffc300" strokeWidth="0.8" opacity="0.65" />

      <g stroke="#ffc300" strokeWidth="1.1" strokeLinecap="round" opacity="0.9">
        {Array.from({ length: 24 }, (_, i) => {
          const [x1, y1] = polar(50, 50, 24, i * 15);
          const [x2, y2] = polar(50, 50, i % 2 === 0 ? 33 : 30, i * 15);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>

      <g fill="#ffd24d">
        {Array.from({ length: STARS }, (_, i) => {
          const [x, y] = polar(50, 50, 36.5, (360 / STARS) * i);
          return <circle key={i} cx={x} cy={y} r="1.5" />;
        })}
      </g>

      <circle cx="50" cy="50" r="19" fill="#5e0c16" />
      <circle cx="50" cy="50" r="19" fill="none" stroke="#ffc300" strokeWidth="1.2" />

      <g fill="#ffc300">
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const [x, y] = polar(50, 50, 9, angle);
          return <ellipse key={angle} cx={x} cy={y} rx="3.4" ry="5.2" transform={`rotate(${angle} ${x} ${y})`} />;
        })}
      </g>

      <circle cx="50" cy="50" r="4.6" fill="#ffd24d" />
      <circle cx="50" cy="50" r="2" fill="#7a1020" />
    </svg>
  );
}
