import { useEffect } from 'react';
import { useSimStore } from '../../state/simStore';

export function DeathToast() {
  const toast = useSimStore((s) => s.deathToast);
  const setDeathToast = useSimStore((s) => s.setDeathToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setDeathToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast, setDeathToast]);

  if (!toast) return null;

  return (
    <div
      className="glass"
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 20px',
        zIndex: 20,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 13 }}>
        <strong>{toast.name}</strong> died at age {toast.age}.
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Cause: {toast.cause}</div>
    </div>
  );
}
