import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export default function MonitoringDashboard() {
  const alerts = [
    { id: 'a1', message: 'Workflow conversion failed: invalid YAML', time: '10m ago' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <AlertCircle className="w-6 h-6 text-rose-600" />
        <h3 className="text-lg font-bold text-slate-900">Recent Alerts</h3>
      </div>
      <div className="space-y-4">
        {alerts.map(alert => (
          <div key={alert.id} className="flex items-center gap-3 p-4 bg-rose-50 rounded-xl border border-rose-100">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <div>
              <p className="text-sm font-bold text-rose-800">{alert.message}</p>
              <p className="text-xs text-rose-600">{alert.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
