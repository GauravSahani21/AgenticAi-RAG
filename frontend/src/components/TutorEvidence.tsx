import { useId } from 'react';
import { FileText } from 'lucide-react';
import type { TutorSource } from '../types';

export function TutorEvidence({ sources, grounded }: { sources: TutorSource[]; grounded?: boolean }) {
  const id = useId();
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-3" open>
      <summary className="cursor-pointer text-xs font-semibold text-slate-700 focus-visible:rounded">
        <FileText className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
        Course evidence ({sources.length})
      </summary>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        {grounded ? 'Retrieved passages used for this response.' : 'Retrieved passages; this response is not marked as grounded in course material.'}
        {' '}Retrieval similarity is not a measure of answer accuracy.
      </p>
      <ol className="mt-3 space-y-2" aria-label="Retrieved source passages">
        {sources.map((source, index) => (
          <li key={`${source.document}-${source.page}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="break-words text-xs font-semibold text-slate-800">[{index + 1}] {source.document || 'Untitled source'}</p>
            <p className="mt-1 break-words text-xs text-slate-500">
              {source.page > 0 ? `Page ${source.page}` : 'Page not provided'}
              {source.section?.trim() ? ` · ${source.section}` : ''}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-teal-700" aria-controls={`${id}-${index}`}>
                Read retrieved passage
              </summary>
              <blockquote id={`${id}-${index}`} className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words border-l-2 border-teal-400 bg-white p-3 text-xs leading-6 text-slate-700" tabIndex={0}>
                {source.snippet?.trim() || 'No passage text was returned for this source.'}
              </blockquote>
            </details>
          </li>
        ))}
      </ol>
    </details>
  );
}
