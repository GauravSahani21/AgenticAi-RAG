import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/api';
import type { AdminOverview, User, UserRole } from '../types';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { 
  ShieldCheck, 
  Users, 
  GraduationCap, 
  Briefcase, 
  Activity, 
  CheckCircle2,
  Trash2, PlusCircle
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<{name: string; email: string; password: string; role: UserRole; department: string}>({
    name: '', email: '', password: '', role: 'FACULTY', department: '',
  });

  const refreshData = async () => {
    const [ovData, usersData] = await Promise.all([
      dashboardService.getAdminOverview(), dashboardService.getAdminUsers(),
    ]);
    setOverview(ovData);
    setUsers(usersData);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ovData, usersData] = await Promise.all([
          dashboardService.getAdminOverview(),
          dashboardService.getAdminUsers(),
        ]);
        setOverview(ovData);
        setUsers(usersData);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Permanently delete ${user.name} (${user.email})? Their learning records will also be removed. Faculty-owned subjects will remain assigned to no one.`)) return;
    setError(null);
    setSuccess(null);
    setDeletingUserId(user.id);
    try {
      await dashboardService.deleteAdminUser(user.id);
      await refreshData();
      setSuccess(`Deleted ${user.email} successfully.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSavingUser(true);
    try {
      await dashboardService.createAdminUser({ ...newUser, department: newUser.department || undefined });
      await refreshData();
      setNewUser({ name: '', email: '', password: '', role: 'FACULTY', department: '' });
      setShowCreateUser(false);
      setSuccess('User created successfully.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setSavingUser(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter === 'ALL') return true;
    return u.role === roleFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              System Administration
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
              System Management
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            System health, active accounts audit registry, and role-based access management
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="flex items-center gap-4 border-l-4 border-l-purple-600">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Users</p>
            <p className="text-2xl font-bold text-slate-800">{overview?.total_users || users.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-emerald-600">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Students</p>
            <p className="text-2xl font-bold text-slate-800">{overview?.students || 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-indigo-600">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Faculty</p>
            <p className="text-2xl font-bold text-slate-800">{overview?.faculty || 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-blue-600">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Admins</p>
            <p className="text-2xl font-bold text-slate-800">{overview?.admins || 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-teal-600">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">System Status</p>
            <p className="text-lg font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Healthy
            </p>
          </div>
        </Card>
      </div>

      {(error || success) && (
        <div role="alert" className={`rounded-lg p-3 text-sm border ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || success}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Account Provisioning</h2>
            <p className="text-xs text-slate-500 mt-1">Only administrators can create faculty and administrator accounts.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCreateUser(!showCreateUser)}>
            <PlusCircle className="w-4 h-4 mr-1" /> {showCreateUser ? 'Cancel' : 'Create User'}
          </Button>
        </div>
        {showCreateUser && (
          <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required aria-label="Full name" placeholder="Full name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="border rounded-lg p-2 text-sm" />
              <input required type="email" aria-label="Email address" placeholder="Email address (e.g. name@gmail.com)" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="border rounded-lg p-2 text-sm" />
              <input required minLength={6} type="password" aria-label="Temporary password" placeholder="Temporary password (6+ characters)" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="border rounded-lg p-2 text-sm" />
              <input aria-label="Department" placeholder="Department (optional)" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} className="border rounded-lg p-2 text-sm" />
              <select aria-label="Account role" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="border rounded-lg p-2 text-sm">
                <option value="STUDENT">Student</option><option value="FACULTY">Faculty</option><option value="ADMIN">Administrator</option>
              </select>
            </div>
            <Button type="submit" size="sm" variant="primary" isLoading={savingUser}>Save User</Button>
          </form>
        )}
      </div>

      {/* User Management Registry */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Registered Users</h2>
            <p className="text-xs text-slate-500">
              Complete user audit log with role-based access attributes
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {['ALL', 'STUDENT', 'FACULTY', 'ADMIN'].map((rf) => (
              <button
                key={rf}
                onClick={() => setRoleFilter(rf)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  roleFilter === rf
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {rf}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Joined At</th>
                <th className="px-6 py-3.5">User ID</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge role={u.role}>{u.role}</Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-700">
                    {u.department || '—'}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(u.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                    {u.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="outline" size="sm"
                      disabled={u.id === overview?.user.id}
                      isLoading={deletingUserId === u.id}
                      onClick={() => handleDeleteUser(u)}
                      title={u.id === overview?.user.id ? 'Cannot delete your own account' : `Delete ${u.name}`}
                      className="text-rose-700 hover:border-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
