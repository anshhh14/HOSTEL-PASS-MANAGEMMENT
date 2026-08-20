import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <p className="hp-eyebrow">Hostel Access Control</p>
        <h1 className="login-title hp-display">HostelPass</h1>
        <p className="login-sub">Sign in to manage requests and gate activity.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={update('email')} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={update('password')} required minLength={8} />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Please wait…' : 'Sign in'}
          </button>
        </form>

        <p className="hint">
          Don't have an account? Ask your hostel admin to create one for you — accounts for students, guards, and wardens are all set up from the Admin panel.
        </p>
      </div>
    </div>
  );
}
