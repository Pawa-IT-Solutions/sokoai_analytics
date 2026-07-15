import React from 'react';

export function Header({
  activeTab,
  filterCategory, setFilterCategory,
  filterStatus, setFilterStatus,
  filterPayment, setFilterPayment,
  filterDateFrom, setFilterDateFrom,
  filterDateTo, setFilterDateTo,
  uniqueCategories, uniqueStatuses, uniquePayments,
  hasActiveFilters, clearFilters,
  filteredOrdersLength
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b border-slate-200 gap-4">
      {/* Left: Title */}
      <div className="flex items-start gap-3 flex-shrink-0">
        <div className="text-2xl text-[#6366f1] mt-1">✨</div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">SokoAI Intelligence Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">Powered by Gemini 2.5 Pro + BQML</p>
        </div>
      </div>

      {/* Right: Filters (only on orders tab) */}
      {activeTab === 'orders' && (
        <div className="flex flex-wrap items-end gap-3">

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-slate-200 rounded-lg px-3.5 py-2 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition min-w-[150px]"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3.5 py-2 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition min-w-[140px]"
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Payment */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment</label>
            <select
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value)}
              className="border border-slate-200 rounded-lg px-3.5 py-2 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition min-w-[150px]"
            >
              <option value="">All Methods</option>
              {uniquePayments.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3.5 py-2 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition min-w-[160px]"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3.5 py-2 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition min-w-[160px]"
            />
          </div>

          {/* Clear / row count */}
          <div className="flex flex-col items-start gap-1 self-end">
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-[12px] font-bold hover:bg-rose-100 transition"
              >
                ✕ Clear
              </button>
            ) : (
              <span className="text-[11px] text-slate-300 font-medium pb-1">No filters</span>
            )}
            {hasActiveFilters && (
              <span className="text-[10px] font-bold text-indigo-500">{filteredOrdersLength} rows</span>
            )}
          </div>

        </div>
      )}
    </header>
  );
}
