import { useEffect, useRef } from 'react'

export default function SacredMark({ size = 220, showRings = true }) {
  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <style>{`
        @keyframes petal-odd {
          0%,100%{ opacity:0.4; stroke-width:0.9px; }
          50%{ opacity:1; stroke-width:1.9px; }
        }
        @keyframes petal-even {
          0%,100%{ opacity:1; stroke-width:1.9px; }
          50%{ opacity:0.4; stroke-width:0.9px; }
        }
        @keyframes core-breathe {
          0%,100%{ transform:scale(1); opacity:0.85; }
          50%{ transform:scale(1.07); opacity:1; }
        }
        @keyframes m-breathe {
          0%,100%{ opacity:0.7; }
          50%{ opacity:1; }
        }
        @keyframes glow-breathe {
          0%,100%{ opacity:0.08; transform:scale(1); }
          50%{ opacity:0.22; transform:scale(1.12); }
        }
        @keyframes ring-fade {
          0%,100%{ opacity:0.05; }
          50%{ opacity:0.12; }
        }
        @keyframes node-pulse {
          0%,100%{ opacity:0.3; }
          50%{ opacity:0.9; }
        }
        .sm-p1{ animation: petal-odd  4s ease-in-out 0s       infinite; }
        .sm-p2{ animation: petal-even 4s ease-in-out 0.66s    infinite; }
        .sm-p3{ animation: petal-odd  4s ease-in-out 1.33s    infinite; }
        .sm-p4{ animation: petal-even 4s ease-in-out 2s       infinite; }
        .sm-p5{ animation: petal-odd  4s ease-in-out 2.66s    infinite; }
        .sm-p6{ animation: petal-even 4s ease-in-out 3.33s    infinite; }
        .sm-core{
          animation: core-breathe 3s ease-in-out infinite;
          transform-origin: 110px 110px;
        }
        .sm-m{ animation: m-breathe 3s ease-in-out infinite; }
        .sm-glow{
          animation: glow-breathe 4s ease-in-out infinite;
          transform-origin: 110px 110px;
        }
        .sm-r1{ animation: ring-fade 4s ease-in-out 0s infinite; }
        .sm-r2{ animation: ring-fade 4s ease-in-out 1s infinite; }
        .sm-r3{ animation: ring-fade 4s ease-in-out 2s infinite; }
        .sm-nd{ animation: node-pulse 4s ease-in-out 0s infinite; }
        .sm-nd2{ animation: node-pulse 4s ease-in-out 2s infinite; }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 220 220"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sm-gt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4CC9A8"/>
            <stop offset="100%" stopColor="#1a7a62"/>
          </linearGradient>
          <linearGradient id="sm-gg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C9A84C"/>
            <stop offset="100%" stopColor="#7a6010"/>
          </linearGradient>
          <radialGradient id="sm-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4CC9A8" stopOpacity="1"/>
            <stop offset="100%" stopColor="#4CC9A8" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Background glow */}
        <circle className="sm-glow" cx="110" cy="110" r="58" fill="url(#sm-glow)"/>

        {/* Outer rings — only if showRings */}
        {showRings && <>
          <circle className="sm-r1" cx="110" cy="110" r="100" fill="none" stroke="#C9A84C" strokeWidth="0.5"/>
          <circle className="sm-r2" cx="110" cy="110" r="82"  fill="none" stroke="#4CC9A8" strokeWidth="0.4"/>
          <circle className="sm-r3" cx="110" cy="110" r="64"  fill="none" stroke="#C9A84C" strokeWidth="0.3"/>
        </>}

        {/* 6 Petals */}
        <ellipse className="sm-p1" cx="110" cy="76" rx="16" ry="34" fill="none" stroke="url(#sm-gt)" strokeLinecap="round"/>
        <ellipse className="sm-p2" cx="110" cy="76" rx="16" ry="34" fill="none" stroke="url(#sm-gg)" strokeLinecap="round" transform="rotate(60 110 110)"/>
        <ellipse className="sm-p3" cx="110" cy="76" rx="16" ry="34" fill="none" stroke="url(#sm-gt)" strokeLinecap="round" transform="rotate(120 110 110)"/>
        <ellipse className="sm-p4" cx="110" cy="76" rx="16" ry="34" fill="none" stroke="url(#sm-gg)" strokeLinecap="round" transform="rotate(180 110 110)"/>
        <ellipse className="sm-p5" cx="110" cy="76" rx="16" ry="34" fill="none" stroke="url(#sm-gt)" strokeLinecap="round" transform="rotate(240 110 110)"/>
        <ellipse className="sm-p6" cx="110" cy="76" rx="16" ry="34" fill="none" stroke="url(#sm-gg)" strokeLinecap="round" transform="rotate(300 110 110)"/>

        {/* Inner star — subtle */}
        <path d="M110 72 L134 114 L86 114 Z" fill="none" stroke="#4CC9A8" strokeWidth="0.6" opacity="0.25"/>
        <path d="M110 148 L86 106 L134 106 Z" fill="none" stroke="#C9A84C" strokeWidth="0.6" opacity="0.25"/>

        {/* Core circle */}
        <circle className="sm-core" cx="110" cy="110" r="22" fill="#05060F" stroke="#4CC9A8" strokeWidth="1.5"/>
        <circle cx="110" cy="110" r="18" fill="none" stroke="#C9A84C" strokeWidth="0.4" opacity="0.4"/>

        {/* M */}
        <text
          className="sm-m"
          x="110" y="118"
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="#4CC9A8"
          fontFamily="'Syne', monospace"
          letterSpacing="1"
        >M</text>

        {/* Node dots at petal tips */}
        <circle className="sm-nd"  cx="110" cy="42"  r="2.5" fill="#4CC9A8"/>
        <circle className="sm-nd2" cx="110" cy="178" r="2.5" fill="#C9A84C"/>
        <circle className="sm-nd"  cx="139" cy="59"  r="2"   fill="#C9A84C"/>
        <circle className="sm-nd2" cx="81"  cy="59"  r="2"   fill="#4CC9A8"/>
        <circle className="sm-nd"  cx="139" cy="161" r="2"   fill="#4CC9A8"/>
        <circle className="sm-nd2" cx="81"  cy="161" r="2"   fill="#C9A84C"/>
      </svg>
    </div>
  )
}
