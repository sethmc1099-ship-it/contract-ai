export default function RiskGauge({ score, overall }) {
  // score: 0-100, higher = more risky
  // Semicircle gauge using SVG
  const clampedScore = Math.max(0, Math.min(100, score || 0))

  // SVG arc parameters
  const cx = 100
  const cy = 100
  const r = 80
  const startAngle = 180 // degrees
  const endAngle = 0 // degrees (semicircle, left to right)

  // Convert score (0-100) to angle (-180 to 0 degrees from positive x-axis, i.e. 180deg arc)
  const scoreAngle = 180 - (clampedScore / 100) * 180

  const toRad = (deg) => (deg * Math.PI) / 180

  // Arc end point for the score indicator
  const indicatorX = cx + r * Math.cos(toRad(scoreAngle))
  const indicatorY = cy - r * Math.sin(toRad(scoreAngle))

  // Color based on score
  const getColor = (s) => {
    if (s < 30) return '#10b981' // green
    if (s < 55) return '#f59e0b' // yellow
    if (s < 75) return '#f97316' // orange
    return '#ef4444' // red
  }

  const color = getColor(clampedScore)

  const getRiskLabel = (s) => {
    if (s < 30) return 'Low Risk'
    if (s < 55) return 'Medium Risk'
    if (s < 75) return 'High Risk'
    return 'Critical Risk'
  }

  // Create the background arc (full semicircle)
  const bgArcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  // Create colored arc segments (gradient effect using 4 arcs)
  const segments = [
    { color: '#10b981', start: 180, end: 135 }, // low (0-25%)
    { color: '#f59e0b', start: 135, end: 90 },  // medium-low (25-50%)
    { color: '#f97316', start: 90, end: 45 },   // medium-high (50-75%)
    { color: '#ef4444', start: 45, end: 0 },    // high (75-100%)
  ]

  const arcPath = (startDeg, endDeg, radius) => {
    const sx = cx + radius * Math.cos(toRad(startDeg))
    const sy = cy - radius * Math.sin(toRad(startDeg))
    const ex = cx + radius * Math.cos(toRad(endDeg))
    const ey = cy - radius * Math.sin(toRad(endDeg))
    return `M ${sx} ${sy} A ${radius} ${radius} 0 0 1 ${ex} ${ey}`
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 200, height: 120 }}>
        <svg width="200" height="120" viewBox="0 0 200 120">
          {/* Background track */}
          <path
            d={bgArcPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Colored segments */}
          {segments.map((seg, i) => (
            <path
              key={i}
              d={arcPath(seg.start, seg.end, r)}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeLinecap={i === 0 ? 'round' : i === 3 ? 'round' : 'butt'}
              opacity="0.25"
            />
          ))}
          {/* Active arc (score indicator) */}
          <path
            d={arcPath(180, scoreAngle, r)}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Needle dot */}
          <circle cx={indicatorX} cy={indicatorY} r="6" fill="white" stroke={color} strokeWidth="3" />
          {/* Score text */}
          <text x={cx} y={cy + 15} textAnchor="middle" className="font-bold" style={{ fontSize: 32, fontWeight: 700, fill: color }}>
            {clampedScore}
          </text>
          <text x={cx} y={cy + 30} textAnchor="middle" style={{ fontSize: 10, fill: '#6b7280' }}>
            / 100
          </text>
        </svg>
      </div>
      <div className="text-center mt-1">
        <span
          className="text-lg font-bold px-4 py-1 rounded-full"
          style={{ color, backgroundColor: color + '20' }}
        >
          {overall || getRiskLabel(clampedScore)}
        </span>
      </div>
    </div>
  )
}
