import React from 'react';
import { MODEL_2_SEGMENTS } from '../../data/segments';

export function KPIRow({ activeTab, totalCustomers, totalRevenue, totalOrders, avgOrderValue }) {
  const formatCurrency = (val) => "KES " + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const parsePercent = (value) => Number(String(value).replace('%', ''));
  const parseKES = (value) => Number(String(value).replace('KES', '').replace(/,/g, '').trim());

  const highestRiskSegment = MODEL_2_SEGMENTS.reduce((max, segment) => (
    parsePercent(segment.cancellation) > parsePercent(max.cancellation) ? segment : max
  ), MODEL_2_SEGMENTS[0]);

  const topValueSegment = MODEL_2_SEGMENTS.reduce((max, segment) => (
    parseKES(segment.totalSpend) > parseKES(max.totalSpend) ? segment : max
  ), MODEL_2_SEGMENTS[0]);

  // DYNAMIC KPI CARD RENDERING
  const kpiSpendLabel = activeTab === 'orders' ? "Total Revenue" : "Avg spend (VIP Centroid)";
  const kpiSpendValue = activeTab === 'orders' ? formatCurrency(totalRevenue) : "KES 282,885";

  const kpiAccuracyLabel = activeTab === 'orders'
    ? 'Total Orders'
    : activeTab === 'model2'
      ? 'Highest Cancellation Risk'
      : 'Class Prediction Accuracy';
  const kpiAccuracyValue = activeTab === 'orders'
    ? totalOrders.toLocaleString()
    : activeTab === 'model2'
      ? highestRiskSegment.cancellation
      : '0.9103';

  const card4Label = activeTab === 'orders'
    ? 'Avg Order Value'
    : activeTab === 'model2'
      ? 'Top Value Segment'
      : 'Synchronized Records';
  const card4Value = activeTab === 'orders'
    ? formatCurrency(avgOrderValue)
    : activeTab === 'model2'
      ? topValueSegment.totalSpend
      : '741,721';
  const card4Subtext = activeTab === 'orders'
    ? 'Revenue per unique order'
    : activeTab === 'model2'
      ? topValueSegment.name
      : 'Purchaser / Visitor Ratio';
  const card4Icon = activeTab === 'orders' ? '📈' : activeTab === 'model2' ? '🏆' : '🔄';

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">

      {/* KPI 1: Total Customers */}
      <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-5 overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-1 h-full bg-sky-500 rounded-l-2xl"></div>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block">Total Customers</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">{totalCustomers.toLocaleString()}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-lg flex-shrink-0">
            👤
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
          <span className="text-sky-600 text-xs font-semibold">
            Total unique customers
          </span>
        </div>
      </div>

      {/* KPI 2: Total Revenue / Avg VIP Spend */}
      <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-5 overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 rounded-l-2xl"></div>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block">{kpiSpendLabel}</span>
            <h3 className="text-xl font-black text-slate-900 mt-1.5 tracking-tight leading-tight">{kpiSpendValue}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-lg flex-shrink-0">
            💰
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
          <span className="text-violet-600 text-xs font-semibold">
            {activeTab === 'orders' ? 'Gross merchandise value' : 'AOV Centroid 2'}
          </span>
        </div>
      </div>

      {/* KPI 3: Total Orders / Prediction Accuracy */}
      <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-5 overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl"></div>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block">{kpiAccuracyLabel}</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">{kpiAccuracyValue}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-lg flex-shrink-0">
            📦
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-amber-600 text-xs font-semibold">
            {activeTab === 'orders' ? 'Unique order numbers' : activeTab === 'model2' ? highestRiskSegment.name : 'Model 2 ROC AUC'}
          </span>
        </div>
      </div>

      {/* KPI 4: Avg Order Value (orders tab) / Synchronized Records (other tabs) */}
      <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-5 overflow-hidden group hover:shadow-md transition-shadow">
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${activeTab === 'orders' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block">
              {card4Label}
            </span>
            <h3 className="text-xl font-black text-slate-900 mt-1.5 tracking-tight leading-tight">
              {card4Value}
            </h3>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${activeTab === 'orders' ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
            {card4Icon}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeTab === 'orders' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
          <span className={`text-xs font-semibold ${activeTab === 'orders' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {card4Subtext}
          </span>
        </div>
      </div>

    </section>
  );
}
