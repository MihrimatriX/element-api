import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService, apiKeyService, apiError } from '../services/api';
import { useSelectedElement } from '../App';
import Seo from '../components/Seo';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setIsAuthenticated, selectedSymbol } = useSelectedElement();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await authService.login({ email, password });
      if (response.token) {
        await apiKeyService.ensureDashboardKey();
        setIsAuthenticated(true);
        const returnTo = searchParams.get('returnTo');
        navigate(returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : `/shop?symbol=${selectedSymbol}`);
      }
    } catch (err: unknown) {
      setError(apiError(err, 'Giriş bilgileri geçersiz.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Seo
        title="Giriş · ElementAPI"
        description="Hesabına giriş. Cüzdan ve API anahtarı."
        path="/login"
      />
      <div className="panel auth-panel">
        <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
          <p className="kicker">Hesap</p>
          <h2 style={{ margin: 0 }}>Giriş yap</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>Cüzdan ve API anahtarı</p>
        </div>
        
        <div className="panel-body">
          {error && (
            <div className="status-badge status-danger" style={{ display: 'flex', width: '100%', marginBottom: '18px', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="fields">
            <div className="field">
              <label htmlFor="email">E-posta Adresi</label>
              <input 
                id="email"
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            
            <div className="field">
              <label htmlFor="password">Şifre</label>
              <input 
                id="password"
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
          
          <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
            Hesabınız yok mu? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 650 }}>Yeni hesap oluşturun</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
