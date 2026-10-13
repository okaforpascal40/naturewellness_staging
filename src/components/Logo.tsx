import React from 'react';

const Logo = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      
      {/* Leaf Icon — same mark as public/favicon.svg; keep the two in sync. */}
      <svg xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32" width="50" height="50" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#2D6A4F"/>
        <g transform="rotate(36 16 16)">
          <path d="M16 22.4C16 24.8 15.7 26.2 14.8 27.3" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
          <path fill="#fff" d="M16 4C16.65 5.7 17.8 7 19.35 8.5C21.5 10.6 22.7 13 22.7 15.8C22.7 20.1 19.7 23.4 16 23.4C12.3 23.4 9.3 20.1 9.3 15.8C9.3 13 10.5 10.6 12.65 8.5C14.2 7 15.35 5.7 16 4Z"/>
          <path fill="#2D6A4F" d="M15.35 21.6L15.72 7.9Q16 7.2 16.28 7.9L16.65 21.6Q16 22.1 15.35 21.6Z"/>
          <g fill="none" stroke="#2D6A4F" strokeLinecap="round" strokeWidth="1.05">
            <path d="M16 19.3C17.9 18.9 19.6 17.9 20.6 16.3M16 19.3C14.1 18.9 12.4 17.9 11.4 16.3"/>
            <path d="M16 14.3C17.6 13.9 18.8 12.9 19.5 11.5M16 14.3C14.4 13.9 13.2 12.9 12.5 11.5"/>
          </g>
        </g>
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

        {/* Ezekiel reference — centered directly under the wordmark, italic, small */}
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: '12px',
          fontWeight: '400',
          fontStyle: 'italic',
          color: '#16a34a',
          letterSpacing: '0.3px',
          textAlign: 'center' as const,
          marginTop: '1px'
        }}>
          Ezek 47:1-12
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
      </div>
    </div>
  );
};

export default Logo;
