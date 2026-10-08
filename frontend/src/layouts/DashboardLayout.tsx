import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
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
    <div className="app-workspace min-h-screen flex flex-col font-sans">
      <a href="#workspace-content" className="skip-link">Skip to workspace</a>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <Link to="/" className="group flex items-center">
                <Logo size="md" />
              </Link>

              <nav className="hidden lg:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      aria-current={isActive ? 'page' : undefined}
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
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <nav aria-label="Mobile workspace navigation" className="lg:hidden flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2">
          {navLinks.map(link => <Link key={link.path} to={link.path} aria-current={location.pathname === link.path ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${location.pathname === link.path ? 'bg-teal-50 text-teal-800' : 'text-slate-600'}`}>{link.name}</Link>)}
        </nav>
      </header>

      <main id="workspace-content" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>AdaptiveLearn AI · Learn with purpose</span>
          <span className="text-slate-400">Your institution. Your learning journey.</span>
        </div>
      </footer>
    </div>
  );
};
