import LeafMark from '@/components/LeafMark';

const Logo = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      
      <LeafMark size={50} />

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
