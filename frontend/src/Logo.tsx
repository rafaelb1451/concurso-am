import { useId } from 'react'

/**
 * Marca do QB Concurso — "QB" de *Quebrando a Banca*.
 *
 * Monograma em selo azul-marinho com filete dourado: lembra o selo de uma banca
 * de exame, sem cair no clichê de escudo.
 */
export default function Logo({ className = 'h-10 w-10' }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const idSelo = `qb-selo-${id}`
  const idFilete = `qb-filete-${id}`

  return (
    <svg
      viewBox="0 0 48 48"
      width="48"
      height="48"
      focusable="false"
      className={className}
      role="img"
      aria-label="QB — Quebrando a Banca"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={idSelo} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a4067" />
          <stop offset="1" stopColor="#16243c" />
        </linearGradient>
        <linearGradient id={idFilete} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b98a3f" />
          <stop offset="1" stopColor="#d9bd88" />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="13" fill={`url(#${idSelo})`} />
      <rect
        x="4.5"
        y="4.5"
        width="39"
        height="39"
        rx="10"
        fill="none"
        stroke="#fafaf9"
        strokeOpacity="0.18"
      />

      <text
        x="24"
        y="30.5"
        textAnchor="middle"
        fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="16"
        fontWeight="800"
        letterSpacing="-0.7"
        fill="#fafaf9"
      >
        QB
      </text>

      <rect x="15" y="34" width="18" height="2.4" rx="1.2" fill={`url(#${idFilete})`} />
    </svg>
  )
}
