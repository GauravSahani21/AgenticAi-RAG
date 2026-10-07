import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { GraduationCap } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
        <GraduationCap className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
      <p className="text-lg font-semibold text-slate-700 mt-2">Page Not Found</p>
      <p className="text-sm text-slate-500 max-w-sm mt-1">
        The requested page does not exist or you do not have permission to view it.
      </p>
      <Link to="/" className="mt-6">
        <Button variant="primary">Return Home</Button>
      </Link>
    </div>
  );
};
