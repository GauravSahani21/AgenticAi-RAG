import React, { useState } from 'react';
import type { InterventionItem } from '../types';
import { facultyAnalyticsService } from '../services/api';
import { Button } from './Button';
import { X, AlertTriangle } from 'lucide-react';



interface InterventionModalProps {
  intervention: InterventionItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS = [
  'PENDING',
  'REVIEWED',
  'STUDENT_CONTACTED',
  'MATERIAL_PROVIDED',
  'FOLLOW_UP_REQUIRED',
  'RESOLVED'
];

export const InterventionModal: React.FC<InterventionModalProps> = ({
  intervention,
  isOpen,
  onClose,
  onUpdated
}) => {
  const [status, setStatus] = useState(intervention.status);
  const [notes, setNotes] = useState(intervention.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await facultyAnalyticsService.updateInterventionStatus(
        intervention.id,
        status,
        notes
      );
      onUpdated();
      onClose();
    } catch (err: any) {
      setError('Failed to update intervention status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Manage Student Intervention
              </h3>
              <p className="text-xs text-slate-500">
                {intervention.student_name} ({intervention.student_email})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* Stored Data Rationale */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-2">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Target Topic: {intervention.topic_name} ({intervention.subject_name})
            </div>
            <p className="text-amber-800 leading-relaxed">
              <strong>Ground Truth Rationale:</strong> {intervention.reason}
            </p>
            <p className="text-amber-900 leading-relaxed pt-1 border-t border-amber-200/60">
              <strong>Recommended Action:</strong> {intervention.recommended_action}
            </p>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Update Intervention Status:
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Faculty Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Faculty Log / Follow-up Notes:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Discussed with student in office hours, shared supplementary lecture slides..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading}>
              Save Intervention
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
