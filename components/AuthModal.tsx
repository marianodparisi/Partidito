import React, { useState, useEffect } from 'react';
import { signInWithGoogle, signInWithEmail } from '../utils/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => {
        setVisible(false);
        setEmail('');
        setEmailSent(false);
        setError('');
        setLoading(false);
      }, 200);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      setError('');
      await signInWithEmail(email);
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar el enlace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className={`relative w-full max-w-md transform transition-all duration-200 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
            <div className="glass-card p-8 relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              {emailSent ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-[var(--primary)] text-3xl">check_circle</span>
                  </div>
                  <h2 className="display-font text-2xl font-black uppercase italic text-white mb-4">¡Revisa tu email!</h2>
                  <p className="mono-font text-white/60 text-sm uppercase tracking-tight mb-6">
                    Te enviamos un enlace mágico a <strong className="text-[var(--primary)]">{email}</strong>. Haz clic en el enlace para iniciar sesión.
                  </p>
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setEmail('');
                    }}
                    className="mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-widest hover:opacity-80"
                  >
                    Volver
                  </button>
                </div>
              ) : (
                <>
                  {/* Logo y Título */}
                  <div className="text-center mb-8">
                    <div className="bg-[var(--primary)] p-3 rounded-sm rotate-3 inline-block mb-4">
                      <span className="material-symbols-outlined text-black font-bold text-3xl block">sports_soccer</span>
                    </div>
                    <h2 className="display-font text-2xl font-black uppercase italic text-white mb-2">Iniciar sesión</h2>
                    <p className="mono-font text-white/40 text-xs uppercase tracking-wider">Guarda tus jugadores y partidos en la nube</p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 mono-font text-xs uppercase tracking-wider">
                      {error}
                    </div>
                  )}

                  {/* Google Sign In */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full mb-4 py-4 px-4 bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mono-font text-xs uppercase tracking-widest"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {loading ? 'Cargando...' : 'Continuar con Google'}
                  </button>

                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-[var(--card-bg-dark)] text-white/30 mono-font text-xs uppercase">o</span>
                    </div>
                  </div>

                  {/* Email Sign In */}
                  <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <div>
                      <label className="block mono-font text-xs font-bold text-white/40 uppercase tracking-widest mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        disabled={loading}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-[var(--primary)] focus:ring-0 outline-none transition-all disabled:opacity-50 mono-font"
                        autoComplete="email"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="w-full py-4 bg-[var(--primary)] text-black font-black uppercase tracking-widest transition-all neon-glow disabled:opacity-50 disabled:cursor-not-allowed mono-font text-xs"
                    >
                      {loading ? 'Enviando...' : 'Enviar enlace mágico'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
