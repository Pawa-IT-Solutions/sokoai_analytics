import { useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';

export function CustomerSegmentsView({
  selectedSegment,
  setSelectedSegment,
  displaySegments,
  isLoadingAI,
  isRefreshingAI,
  aiError,
  lastGeneratedAt,
  onRefreshAICopy,
}) {
  const currentSegment = displaySegments.find(s => s.id === selectedSegment) || displaySegments[0];
  const playbookItems = currentSegment?.action
    ? currentSegment.action
      .split(/\s*\d+\.\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
    : [];
  const panelRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    if (!panelRef.current) return;
    setIsExporting(true);

    const opt = {
      margin: 0.5,
      filename: `SokoAI_Segment_${currentSegment.id}_${currentSegment.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(panelRef.current).save().then(() => {
      setIsExporting(false);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List of Clusters */}
      <div className="lg:col-span-1 space-y-4">
        <div className="h-12 flex items-center">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-0">Select Cluster</h2>
        </div>
        {displaySegments.map((segment) => (
          <button
            key={segment.id}
            onClick={() => setSelectedSegment(segment.id)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${selectedSegment === segment.id
              ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
              : 'bg-slate-100/50 border-slate-200 hover:border-slate-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{segment.icon}</span>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{segment.name}</h4>
                  <p className="text-sm text-slate-600 mt-0.5">Cluster {segment.id}</p>
                  {isLoadingAI && !segment.aiTagline && (
                    <div className="mt-1 h-2.5 w-24 bg-slate-200 rounded animate-pulse"></div>
                  )}
                  {segment.aiTagline && (
                    <p className="text-xs text-emerald-700 mt-1 font-semibold">{segment.aiTagline}</p>
                  )}
                </div>
              </div>
              <span className="text-slate-600 text-sm font-semibold">AOV: {segment.aov}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Right Column: PDF Export Button + Centroid Detailed Metrics Panel */}
      <div className="lg:col-span-2 space-y-4">
        <div className="h-12 flex items-center">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Customer Segment Report</h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-h-9 flex items-center">
            {isLoadingAI && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"></span>
                Generating AI segment copy...
              </span>
            )}
            {!isLoadingAI && aiError && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                {aiError}
              </span>
            )}
            {!isLoadingAI && !aiError && lastGeneratedAt && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Last refreshed {new Date(lastGeneratedAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Export Button Header */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshAICopy}
              disabled={isRefreshingAI}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${isRefreshingAI
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                }`}
            >
              {isRefreshingAI ? 'Refreshing AI Result...' : 'Refresh AI Result'}
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${isExporting
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-[#6366f1] hover:bg-indigo-600 text-white'
                }`}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* The actual panel to be exported (wrapped in a ref) */}
        <div ref={panelRef} className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden relative">
          <div className="bg-black px-6 py-4 flex items-center justify-between">
            <img src="/fill-logo.png" alt="SokoAI" className="h-8 object-contain" />
            <span className="text-white text-xs font-semibold uppercase tracking-wider">Customer Segment Report</span>
          </div>

          <div className="p-6 space-y-6">
            {isLoadingAI && !lastGeneratedAt && (
              <div className="space-y-3">
                <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse"></div>
                <div className="h-20 w-full bg-slate-100 rounded-xl animate-pulse"></div>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{currentSegment.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{currentSegment.name}</h3>
                  <p className="text-xs text-slate-500">Centroid Index ID: {currentSegment.id}</p>
                  {currentSegment.aiTagline && (
                    <p className="text-xs text-emerald-700 font-semibold mt-1">{currentSegment.aiTagline}</p>
                  )}
                </div>
              </div>
              <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-mono border border-slate-200">Davies-Bouldin Index: 1.81</span>
            </div>

            {currentSegment.aiLabels && (
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                  Risk: {currentSegment.aiLabels.risk_level || 'n/a'}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                  Value Tier: {currentSegment.aiLabels.value_tier || 'n/a'}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                  Channel: {currentSegment.aiLabels.primary_channel_label || 'n/a'}
                </span>
              </div>
            )}

            {/* Metric grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                <span className="text-xs text-slate-500 block tracking-wide">Average Order Value</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">{currentSegment.aov}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                <span className="text-xs text-slate-500 block tracking-wide">Total Spend</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">{currentSegment.totalSpend}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                <span className="text-xs text-slate-500 block tracking-wide">Purchase Frequency</span>
                <span className="text-sm font-semibold text-slate-900 mt-1 block">{currentSegment.frequency}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                <span className="text-xs text-emerald-600 block tracking-wide font-semibold">M-PESA Usage</span>
                <span className="text-base font-bold text-emerald-600 mt-1 block">{currentSegment.mpesaRate}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                <span className="text-xs text-rose-600 block tracking-wide font-semibold">Cancellation Rate</span>
                <span className="text-base font-bold text-rose-600 mt-1 block">{currentSegment.cancellation}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                <span className="text-xs text-slate-500 block tracking-wide">Primary Markets</span>
                <span className="text-xs font-semibold text-slate-800 mt-1 block leading-snug break-words">{currentSegment.cities}</span>
              </div>
            </div>

            {/* Behavioral profile */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/50">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Behavioral Profile</h4>
              <p className="text-sm text-slate-700 leading-relaxed">{currentSegment.profile}</p>
            </div>

            {/* Action playbook */}
            <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/20 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-600">⚡</span>
                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Automated Operational Playbook</h4>
              </div>
              {playbookItems.length > 0 ? (
                <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700">
                  {playbookItems.map((item, index) => (
                    <li key={`${currentSegment.id}-playbook-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-700">{currentSegment.action}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
