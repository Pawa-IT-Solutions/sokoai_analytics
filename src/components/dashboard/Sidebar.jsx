import React from 'react';

export function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between flex-shrink-0">
      <div>
        <div className="p-6 flex items-center justify-center bg-slate-900 border-b border-slate-800">
          <img src="/full-logo.png" alt="SokoAI Intelligence Hub" className="h-8 object-contain" />
        </div>

        {/* Navigation Section */}
        <div className="px-4 py-6">
          <div className="px-2 mb-4">
            <span className="block w-full rounded-lg bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-2 text-center shadow-sm">
              SOKOAI ANALYTICS
            </span>
          </div>
          <nav className="space-y-1">

            {/* Tab 1: Order details */}
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'orders'
                ? 'bg-[#f0f9ff] text-[#0284c7] font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
            >
              <span>📦</span> Order Details Explorer
            </button>

            {/* Tab 2: Run Predictions */}
            <button
              onClick={() => setActiveTab('testbed')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'testbed'
                ? 'bg-[#f0f9ff] text-[#0284c7] font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
            >
              <span>🧪</span> Run Predictions
            </button>

            {/* Tab 3: Predictions Report */}
            <button
              onClick={() => setActiveTab('model1')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'model1'
                ? 'bg-[#f0f9ff] text-[#0284c7] font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
            >
              <span>🎯</span> Predictions Report
            </button>

            {/* Tab 4: Customer Segments */}
            <button
              onClick={() => setActiveTab('model2')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'model2'
                ? 'bg-[#f0f9ff] text-[#0284c7] font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
            >
              <span>👥</span> Customer Segments
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom User Card */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#00acc1] text-white flex items-center justify-center font-bold text-sm">
            J
          </div>
          <div>
            <span className="font-bold text-xs text-slate-800 block">Admin</span>
            <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">john.higi@pawait...</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
