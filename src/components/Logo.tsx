import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo = ({ className = "w-[200px] md:w-[300px]" }: LogoProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" className={className}>
      <defs>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#22c55e',stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:'#16a34a',stopOpacity:1}} />
        </linearGradient>
        <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#4ade80',stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:'#22c55e',stopOpacity:1}} />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#fbbf24',stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:'#f59e0b',stopOpacity:1}} />
        </linearGradient>
        <filter id="glow">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#22c55e" floodOpacity="0.4"/>
        </filter>
      </defs>
      <rect width="400" height="120" rx="12" fill="#0f1f0f"/>
      <circle cx="370" cy="20" r="60" fill="#16a34a" opacity="0.05"/>
      <circle cx="20" cy="100" r="40" fill="#16a34a" opacity="0.05"/>
      <circle cx="58" cy="60" r="46" fill="none" stroke="#166534" strokeWidth="1.5"/>
      <path d="M58 18 C58 18 88 38 88 62 C88 80 75 92 58 92 C41 92 28 80 28 62 C28 38 58 18 58 18 Z"
        fill="url(#leafGrad)" filter="url(#glow)"/>
      <path d="M58 88 C58 88 58 40 58 20"
        stroke="#dcfce7" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
      <path d="M58 70 C50 65 38 63 32 60" stroke="#dcfce7" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4"/>
      <path d="M58 57 C49 52 40 49 33 46" stroke="#dcfce7" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4"/>
      <path d="M58 44 C51 40 44 38 38 35" stroke="#dcfce7" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.3"/>
      <path d="M58 70 C66 65 78 63 84 60" stroke="#dcfce7" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4"/>
      <path d="M58 57 C67 52 76 49 83 46" stroke="#dcfce7" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4"/>
      <path d="M58 44 C65 40 72 38 78 35" stroke="#dcfce7" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.3"/>
      <path d="M72 22 C72 22 92 30 90 48 C88 60 78 64 70 58 C62 52 62 36 72 22 Z"
        fill="url(#leafGrad2)" opacity="0.8"/>
      <path d="M36 68 C36 68 18 72 16 86 C14 96 22 104 32 100 C42 96 46 80 36 68 Z"
        fill="url(#leafGrad2)" opacity="0.7"/>
      <circle cx="58" cy="60" r="4" fill="url(#accentGrad)"/>
      <circle cx="58" cy="46" r="2.5" fill="#fbbf24" opacity="0.9"/>
      <circle cx="58" cy="73" r="2.5" fill="#fbbf24" opacity="0.9"/>
      <text x="116" y="52"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="32"
        fontWeight="700"
        letterSpacing="-0.5"
        fill="#f0fdf4">Nature</text>
      <text x="116" y="86"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="32"
        fontWeight="700"
        letterSpacing="-0.5"
        fill="url(#leafGrad)">Wellness</text>
      <text x="118" y="104"
        fontFamily="'Trebuchet MS', Helvetica, sans-serif"
        fontSize="10"
        letterSpacing="2.5"
        fill="#4ade80"
        opacity="0.7"
        fontWeight="400">SCIENCE · NATURE · HEALTH</text>
      <text x="352" y="112"
        fontFamily="Georgia, serif"
        fontSize="8"
        fill="#166534"
        textAnchor="middle"
        fontStyle="italic">Ezek 47:12</text>
    </svg>
  );
};

export default Logo;
