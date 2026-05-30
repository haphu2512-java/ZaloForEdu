import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  // state: { message, isDanger, resolve }
  const resolveRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message, isDanger: !!options.isDanger });
    });
  }, []);

  const handleConfirm = () => {
    setState(null);
    resolveRef.current?.(true);
  };

  const handleCancel = () => {
    setState(null);
    resolveRef.current?.(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={handleCancel}
        >
          <div
            style={{
              background: 'var(--z-bg-sidebar, #1e1e1e)',
              borderRadius: 12,
              padding: '24px',
              width: 360,
              maxWidth: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--z-text-primary, #fff)' }}>
                Xác nhận
              </span>
              <button
                onClick={handleCancel}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--z-text-secondary, #aaa)', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {/* Message */}
            <p style={{ color: 'var(--z-text-secondary, #ccc)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              {state.message}
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: '1px solid var(--z-border, #444)',
                  background: 'transparent', color: 'var(--z-text-primary, #fff)',
                  cursor: 'pointer', fontWeight: 600, fontSize: 14,
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: state.isDanger ? '#E53E3E' : '#0068FF',
                  color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
