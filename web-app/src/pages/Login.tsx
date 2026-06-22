import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService, apiKeyService } from '../services/api';
import { useSelectedElement } from '../App';

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
        setIsAuthenticated(true);
        // Fetch or Generate API Key upon login for seamless experience
        try {
           const apiKeyRes = await apiKeyService.generate('Web Dashboard Key', 10);
           localStorage.setItem('apiKey', apiKeyRes.apiKey);
        } catch (keyErr) {
           console.warn('Could not generate API Key automatically, user will need to do it manually.', keyErr);
        }
        
        const returnTo = searchParams.get('returnTo');
        navigate(returnTo || `/trading?symbol=${selectedSymbol}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data || 'Giriş bilgileri geçersiz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="panel auth-panel">
        <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
          <p className="kicker">Hesap</p>
          <h2 style={{ margin: 0 }}>Giriş yap</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>Mağaza ve sipariş takibi için geliştirici hesabı</p>
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
