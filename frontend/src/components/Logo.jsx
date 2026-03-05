import { motion } from 'framer-motion'

// Scan duration (seconds) for one full top→bottom sweep
const SCAN_DUR = 3.0
// Label y-range the scan travels across
const Y0 = 3, Y1 = 97

// Given a text element's rendered y (baseline), return the Framer Motion
// keyframe arrays [scale, opacity] + times[] that make the element "pop in"
// exactly when the scan line reaches it, stay visible, then fade before loop reset.
function scanKeyframes(elemY) {
  // Clamp to 0.82 so all 7 keyframe times stay strictly monotonic (t1+0.02 ≤ 0.89 < 0.93)
  const appear = Math.min((elemY - Y0) / (Y1 - Y0), 0.82)
  const t0 = Math.max(0, appear - 0.01)
  const t1 = appear + 0.05
  return {
    scale:   [0.25, 0.25, 1.05, 1.0,      1.0,  0.25, 0.25],
    opacity: [0,    0,    1,    1.0,      1.0,  0,    0   ],
    times:   [0,    t0,   t1,   t1 + 0.02, 0.93, 0.97, 1.0],
  }
}

const Logo = ({ className = "w-10 h-10" }) => {

  // [elemY, label-left-text, value-right-text, isBold]
  const rows = [
    [49, 'Total Fat',   '2g',    true ],
    [56, 'Sodium',      '160mg', false],
    [63, 'Total Carb.', '37g',   false],
    [70, 'Protein',     '3g',    true ],
  ]

  const loop = { duration: SCAN_DUR, repeat: Infinity, ease: 'linear' }

  // Helper: animated text with zoom-pop on scan pass
  const ScanText = ({ y, children, fontSize = 5.5, fontWeight = 'normal', anchor = 'middle', x = 50, dx = 0 }) => {
    const kf = scanKeyframes(y)
    return (
      <motion.text
        x={x + dx} y={y}
        fontSize={fontSize}
        fontWeight={fontWeight}
        fontFamily="Arial, sans-serif"
        fill="#111"
        textAnchor={anchor}
        style={{ originX: `${x + dx}px`, originY: `${y}px` }}
        animate={{ scale: kf.scale, opacity: kf.opacity }}
        transition={{ ...loop, times: kf.times }}
      >
        {children}
      </motion.text>
    )
  }

  return (
    <motion.svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      whileHover={{ scale: 2 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
    >
      <defs>
        {/* Clip to label area */}
        <clipPath id="labelClip">
          <rect x="5" y={Y0} width="90" height={Y1 - Y0} rx="3" />
        </clipPath>
        {/* Scan glow */}
        <filter id="glow" x="-10%" y="-400%" width="120%" height="900%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Scan gradient overlay */}
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="50%"  stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Label background ── */}
      <rect x="5" y={Y0} width="90" height={Y1 - Y0} rx="3" fill="white" />
      <rect x="5" y={Y0} width="90" height={Y1 - Y0} rx="3"
            stroke="#111" strokeWidth="1.5" />

      {/* ── Header: "Nutrition Facts" ── */}
      <ScanText y={14} fontSize={11} fontWeight="900">Nutrition</ScanText>
      <ScanText y={22} fontSize={9}  fontWeight="900">Facts</ScanText>

      {/* Thick rule under header */}
      <motion.rect x="5" y="24" width="90" height="3.5" fill="#111"
        animate={{ scaleX: [0, 0, 1, 1, 1, 0, 0], opacity: [0,0,1,1,1,0,0] }}
        style={{ originX: '5px' }}
        transition={{ ...loop, times: [0, 0.17, 0.22, 0.90, 0.93, 0.96, 1] }}
      />

      {/* ── Calories row ── */}
      <ScanText y={34} fontSize={6.5} fontWeight="700" anchor="start" x={8}>Calories</ScanText>
      <ScanText y={34} fontSize={9}   fontWeight="900" anchor="end"   x={92}>230</ScanText>

      {/* Medium rule */}
      <motion.rect x="5" y="37" width="90" height="1.2" fill="#111"
        animate={{ scaleX: [0,0,1,1,1,0,0], opacity: [0,0,1,1,1,0,0] }}
        style={{ originX: '5px' }}
        transition={{ ...loop, times: [0, 0.30, 0.35, 0.90, 0.93, 0.96, 1] }}
      />

      {/* % Daily Value header */}
      <ScanText y={43} fontSize={4.2} fontWeight="700" anchor="end" x={92}>% Daily Value*</ScanText>

      {/* ── Nutrient rows with alternating thin rules ── */}
      {rows.map(([y, label, val, bold], i) => {
        const ruleKf = scanKeyframes(y - 5)
        return (
          <g key={i}>
            {/* thin rule above row */}
            <motion.rect x="5" y={y - 5} width="90" height="0.6" fill="#999"
              animate={{ scaleX: ruleKf.scale, opacity: ruleKf.opacity }}
              style={{ originX: '5px', originY: `${y - 5}px` }}
              transition={{ ...loop, times: ruleKf.times }}
            />
            <ScanText y={y} fontSize={5} fontWeight={bold ? '700' : '400'} anchor="start" x={8}>{label}</ScanText>
            <ScanText y={y} fontSize={5} fontWeight="700" anchor="end" x={92}>{val}</ScanText>
          </g>
        )
      })}

      {/* Thick bottom rule */}
      <motion.rect x="5" y="73" width="90" height="2.5" fill="#111"
        animate={{ scaleX: [0,0,1,1,1,0,0], opacity: [0,0,1,1,1,0,0] }}
        style={{ originX: '5px' }}
        transition={{ ...loop, times: [0, 0.75, 0.80, 0.90, 0.93, 0.96, 1] }}
      />

      {/* ── Footer fine-print ── */}
      <ScanText y={80} fontSize={3.8} fontWeight="400">* Percent Daily Values based on a</ScanText>
      <ScanText y={85} fontSize={3.8} fontWeight="400">2,000 calorie diet.</ScanText>

      {/* ── Brand tag ── */}
      <ScanText y={94} fontSize={5} fontWeight="900">NutriScan AI</ScanText>

      {/* ══ Animated scan line ══ */}
      <motion.line
        x1="5" x2="95"
        strokeWidth="1.2"
        stroke="#22d3ee"
        filter="url(#glow)"
        clipPath="url(#labelClip)"
        animate={{ y1: [Y0, Y1, Y0], y2: [Y0, Y1, Y0] }}
        transition={loop}
      />
      {/* Glow band */}
      <motion.rect x="5" width="90" height="7" fill="url(#sg)"
        clipPath="url(#labelClip)"
        animate={{ y: [Y0 - 3.5, Y1 - 3.5, Y0 - 3.5] }}
        transition={loop}
      />

      {/* ── Corner bracket focus marks ── */}
      {[
        `M5,13 L5,${Y0} L15,${Y0}`,
        `M95,13 L95,${Y0} L85,${Y0}`,
        `M5,87 L5,${Y1} L15,${Y1}`,
        `M95,87 L95,${Y1} L85,${Y1}`,
      ].map((d, i) => (
        <motion.path key={i} d={d}
          stroke="#00acac" strokeWidth="2.2" strokeLinecap="round" fill="none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.06, duration: 0.4, type: 'spring' }}
        />
      ))}
    </motion.svg>
  )
}

export default Logo
