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
  Eye,
  EyeOff,
  UserCheck,
  BookOpen,
  ShieldCheck,
  Check
} from 'lucide-react';

interface RoleOption {
  id: 'STUDENT' | 'FACULTY' | 'ADMIN';
  label: string;
  sublabel: string;
  email: string;
  password: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRESET_ROLES: RoleOption[] = [
  {
    id: 'STUDENT',
    label: 'Student',
    sublabel: 'Jane Student',
    email: 'student@adaptivelearn.edu',
    password: 'Password123!',
    icon: UserCheck,
  },
  {
    id: 'FACULTY',
    label: 'Instructor / Teacher',
    sublabel: 'Prof. Alan Turing',
    email: 'faculty@adaptivelearn.edu',
    password: 'Password123!',
    icon: BookOpen,
  },
  {
    id: 'ADMIN',
    label: 'Administrator',
    sublabel: 'IT Admin',
    email: 'admin@adaptivelearn.edu',
    password: 'Password123!',
    icon: ShieldCheck,
  },
];

export const LoginPage: React.FC = () => {
  const { login, getDashboardRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setLoading(true);

    try {
      const user = await login(loginEmail, loginPass);
      const from = (location.state as any)?.from?.pathname || getDashboardRoute(user.role);
      navigate(from, { replace: true });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Invalid email or password. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleSelectRole = (role: RoleOption) => {
    setSelectedRole(role.id);
    setEmail(role.email);
    setPassword(role.password);
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
          <div className="mb-5">
            <h2 className="text-base font-semibold text-zinc-900">Sign in to your account</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select a role below or enter your institutional credentials
            </p>
          </div>

          {/* Role Selector Options */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-zinc-700 mb-2">
              Select Role to Login
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_ROLES.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.id || email === r.email;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRole(r)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/80 text-teal-900 ring-2 ring-teal-600/20 font-medium'
                        : 'border-zinc-200 bg-zinc-50/60 hover:bg-zinc-100/80 text-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-teal-700' : 'text-zinc-500'}`} />
                      {isSelected && <Check className="w-3 h-3 text-teal-700" />}
                    </div>
                    <span className="text-xs font-semibold mt-1 leading-tight">{r.label}</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-full">
                      {r.sublabel.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSelectedRole(null);
                  }}
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
