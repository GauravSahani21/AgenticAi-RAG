import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import {
  AlertCircle,
  Mail,
  Lock,
  ArrowRight,
  UserCheck,
  BookOpen,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, getDashboardRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const errorMsg = err.response?.data?.detail || 'Invalid email or password. Please try again.';
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
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Card Title */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-zinc-900">Sign in to your account</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enter your university credentials to continue
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Institutional Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@adaptivelearn.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-zinc-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2.5">
              <span className="font-medium text-zinc-700">Quick Demo Access</span>
              <span className="text-[11px] text-zinc-400">Click to fill</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('student@adaptivelearn.edu')}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg border border-zinc-200 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-zinc-500" />
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('faculty@adaptivelearn.edu')}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg border border-zinc-200 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                <span>Faculty</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@adaptivelearn.edu')}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg border border-zinc-200 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                <span>Admin</span>
              </button>
            </div>
            <div className="mt-2.5 text-center text-[11px] text-zinc-400">
              Preset password: <code className="font-mono text-zinc-600 bg-zinc-100 px-1 py-0.5 rounded">Password123!</code>
            </div>
          </div>

          {/* Registration Link */}
          <div className="mt-6 pt-4 border-t border-zinc-100 text-center text-xs text-zinc-500">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-medium text-zinc-900 hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-zinc-400">
          Faculty-approved RAG groundings with real-time adaptive tutoring
        </p>
      </div>
    </div>
  );
};
