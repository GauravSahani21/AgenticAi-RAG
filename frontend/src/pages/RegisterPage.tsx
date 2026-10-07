import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';
import { Button } from '../components/Button';
import {
  GraduationCap,
  AlertCircle,
  User,
  Mail,
  Lock,
  Building,
  ArrowRight,
  Shield,
  BookOpen
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register, getDashboardRoute } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const user = await register({
        name,
        email,
        password,
        role,
        department: department.trim() ? department : undefined,
      });
      const route = getDashboardRoute(user.role);
      navigate(route, { replace: true });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Registration failed. Please check your information.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 leading-none">
              AdaptiveLearn AI
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Academic Agentic Platform
            </p>
          </div>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Card Title */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-zinc-900">Create your account</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Register as a student, faculty member, or institutional administrator
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
              <label htmlFor="name" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Alan Turing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-colors"
                />
              </div>
            </div>

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
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Institutional Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                    role === 'STUDENT'
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('FACULTY')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                    role === 'FACULTY'
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Faculty</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ADMIN')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                    role === 'ADMIN'
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="department" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Academic Department <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  id="department"
                  name="department"
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-4 border-t border-zinc-100 text-center text-xs text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-zinc-900 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
