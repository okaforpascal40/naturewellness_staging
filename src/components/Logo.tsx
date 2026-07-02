import React from 'react';

const Logo = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      
      {/* Leaf Icon */}
      <svg xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 80 80" width="50" height="50">
        <defs>
          <linearGradient id="leafG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor:'#16a34a',stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:'#15803d',stopOpacity:1}} />
          </linearGradient>
          <linearGradient id="leafG2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor:'#22c55e',stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:'#16a34a',stopOpacity:1}} />
          </linearGradient>
          <linearGradient id="accentG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor:'#f59e0b',stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:'#d97706',stopOpacity:1}} />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="none" stroke="#dcfce7" strokeWidth="1.5"/>
        <path d="M40 8 C40 8 65 22 65 44 C65 58 54 68 40 68 C26 68 15 58 15 44 C15 22 40 8 40 8 Z"
          fill="url(#leafG)"/>
        <path d="M40 64 C40 64 40 20 40 10" 
          stroke="#bbf7d0" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7"/>
        <path d="M40 52 C33 48 24 46 18 44" stroke="#bbf7d0" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
        <path d="M40 42 C33 38 25 36 19 33" stroke="#bbf7d0" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
        <path d="M40 52 C47 48 56 46 62 44" stroke="#bbf7d0" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
        <path d="M40 42 C47 38 55 36 61 33" stroke="#bbf7d0" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
        <path d="M50 12 C50 12 68 20 66 34 C64 44 56 48 49 43 C42 38 42 24 50 12 Z"
          fill="url(#leafG2)" opacity="0.85"/>
        <path d="M24 46 C24 46 10 50 8 60 C6 68 13 74 21 71 C29 68 32 56 24 46 Z"
          fill="url(#leafG2)" opacity="0.75"/>
        <circle cx="40" cy="40" r="3.5" fill="url(#accentG)"/>
        <circle cx="40" cy="28" r="2" fill="#fbbf24" opacity="0.8"/>
        <circle cx="40" cy="52" r="2" fill="#fbbf24" opacity="0.8"/>
      </svg>

      {/* Text Block */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
        
        {/* NatureWellness */}
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: '22px',
          fontWeight: '700',
          color: '#14532d',
          letterSpacing: '-0.3px'
        }}>
          NatureWellness
        </span>

        {/* Ezekiel Reference — directly under the name, ~70% of its size, italic */}
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: '15px',
          fontWeight: '400',
          fontStyle: 'italic',
          color: '#16a34a',
          letterSpacing: '0.3px',
          marginTop: '1px'
        }}>
          Ezek 47:12
        </span>

        {/* Branding kicker */}
        <span style={{
          fontFamily: "'Trebuchet MS', Helvetica, sans-serif",
          fontSize: '8px',
          fontWeight: '500',
          color: '#6b7280',
          letterSpacing: '1.5px',
          marginTop: '3px',
          textTransform: 'uppercase' as const
        }}>
          Nature • Science • Health
        </span>

        {/* Tagline */}
        <span style={{
          fontFamily: "'Trebuchet MS', Helvetica, sans-serif",
          fontSize: '9px',
          fontWeight: '500',
          color: '#6b7280',
          letterSpacing: '0.2px',
          marginTop: '2px'
        }}>
          Plant Nutrition. Powered by Science. Guided by Nature.
        </span>
      </div>
    </div>
  );
};

export default Logo;
