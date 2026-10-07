import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { 
  GraduationCap, 
  LogOut, 
  BookOpen, 
  ShieldCheck, 
  LayoutDashboard,
  Building
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleNavLinks = () => {
    if (!user) return [];
    switch (user.role) {
      case 'STUDENT':
        return [
          { name: 'Student Dashboard', path: '/student', icon: LayoutDashboard },
        ];
      case 'FACULTY':
        return [
          { name: 'Faculty Dashboard', path: '/faculty', icon: LayoutDashboard },
        ];
      case 'ADMIN':
        return [
          { name: 'Admin Dashboard', path: '/admin', icon: ShieldCheck },
          { name: 'Faculty View', path: '/faculty', icon: BookOpen },
          { name: 'Student View', path: '/student', icon: GraduationCap },
        ];
      default:
        return [];
    }
  };

  const navLinks = getRoleNavLinks();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                    AdaptiveLearn <span className="text-blue-600 font-extrabold">AI</span>
                  </span>
                  <span className="block text-[10px] font-medium tracking-wider uppercase text-slate-400">
                    Agentic Academic Platform
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-slate-800 leading-tight">
                      {user.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                      {user.department && (
                        <span className="flex items-center gap-0.5">
                          <Building className="w-3 h-3 inline" /> {user.department}
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge role={user.role}>{user.role}</Badge>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-slate-600 hover:text-rose-600 hover:border-rose-300 ml-1"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>AdaptiveLearn AI — Phase 1 Application Foundation</span>
          <span className="text-slate-400">Institutional Role-Based Learning System</span>
        </div>
      </footer>
    </div>
  );
};
