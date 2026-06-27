import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsDashboard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-emerald-600" />
        <h3 className="text-lg font-bold text-slate-900">Conversion Analytics</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-sm font-medium text-emerald-800">Total Scripts</p>
          <p className="text-2xl font-bold text-emerald-900">128</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm font-medium text-blue-800">Success Rate</p>
          <p className="text-2xl font-bold text-blue-900">94%</p>
        </div>
      </div>
    </div>
  );
}
