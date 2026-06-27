import React from 'react';
import { Server, Activity, CheckCircle, XCircle } from 'lucide-react';

export default function DeploymentDashboard() {
  // Placeholder for real Render integration
  const deployments = [
    { id: 'dep-1', name: 'prod-api-v1', status: 'live', updatedAt: '2m ago' },
    { id: 'dep-2', name: 'stage-api-v2', status: 'building', updatedAt: '1m ago' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Server className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-bold text-slate-900">Deployment Status</h3>
      </div>
      <div className="space-y-4">
        {deployments.map(dep => (
          <div key={dep.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">{dep.name}</p>
              <p className="text-xs text-slate-500">{dep.updatedAt}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${dep.status === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {dep.status.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
