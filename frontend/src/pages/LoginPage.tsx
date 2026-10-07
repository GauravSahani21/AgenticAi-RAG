import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { GraduationCap, AlertCircle, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, getDashboardRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      const from = (location.state as any)?.from?.pathname || getDashboardRoute(user.role);
      navigate(from, { replace: true });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to sign in. Please verify your credentials.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
            <GraduationCap className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-white tracking-tight">
          AdaptiveLearn <span className="text-blue-400">AI</span>
        </h2>
        <p className="mt-1 text-center text-sm text-slate-300">
          Agentic RAG-Based Adaptive Learning & Faculty Intervention
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900">Sign in to your account</h3>
            <p className="text-xs text-slate-500 mt-1">
              Access your institutional dashboard and personalized learning path
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              id="email"
              name="email"
              type="email"
              label="Institutional Email"
              placeholder="user@adaptivelearn.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              <span>Quick Demo Logins (Pre-seeded)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('student@adaptivelearn.edu')}
                className="py-1.5 px-2 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors text-center"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('faculty@adaptivelearn.edu')}
                className="py-1.5 px-2 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors text-center"
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@adaptivelearn.edu')}
                className="py-1.5 px-2 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md border border-purple-200 transition-colors text-center"
              >
                Admin
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 text-center">
              Password for all demo accounts: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">Password123!</code>
            </p>
          </div>

          <div className="mt-6 text-center text-sm text-slate-600">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
              Register now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
