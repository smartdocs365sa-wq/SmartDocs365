// ============================================
// FILE: src/components/common/Modal.jsx
// ============================================
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: { maxWidth: '448px' },
    md: { maxWidth: '672px' },
    lg: { maxWidth: '896px' },
    xl: { maxWidth: '1152px' }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={sizeStyles[size]}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;