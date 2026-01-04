// ============================================
// FILE: src/components/common/Loader.jsx
// ============================================
const Loader = ({ size = 'md', text = '' }) => {
    const sizeStyles = {
      sm: { width: '24px', height: '24px' },
      md: { width: '48px', height: '48px' },
      lg: { width: '64px', height: '64px' }
    };
  
    return (
      <div className="loader">
        <div className="spinner" style={sizeStyles[size]}></div>
        {text && <p style={{ marginTop: '1rem', color: '#6b7280' }}>{text}</p>}
      </div>
    );
  };
  
  export default Loader;
  