import React, { useEffect, useMemo, useRef, useState } from 'react';

export function FutureBuyerPredictorView({ setActionNotify }) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [sortBy, setSortBy] = useState('prob');
    const [sortDir, setSortDir] = useState('desc');
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({ tp: 0, fp: 0, tn: 0, fn: 0, avgProb: 0, buckets: [0, 0, 0, 0, 0] });
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const pageCacheRef = useRef(new Map());

    useEffect(() => {
        let mounted = true;
        const cacheKey = `${page}:${pageSize}:${sortBy}:${sortDir}`;
        const cached = pageCacheRef.current.get(cacheKey);

        if (cached) {
            setRows(cached.rows);
            setSummary(cached.summary);
            setTotal(cached.total);
            setTotalPages(cached.totalPages);
            setError('');
            return () => {
                mounted = false;
            };
        }

        const fetchPage = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await fetch(`/api/predictions?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortDir=${sortDir}`);
                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}`;
                    try {
                        const payload = await response.json();
                        if (payload?.details) errorMessage = payload.details;
                        else if (payload?.error) errorMessage = payload.error;
                    } catch {
                        // Keep generic HTTP message if the error payload is not JSON.
                    }
                    throw new Error(errorMessage);
                }
                const data = await response.json();

                if (!mounted) return;

                const normalized = {
                    rows: Array.isArray(data.rows) ? data.rows : [],
                    summary: data.summary ?? { tp: 0, fp: 0, tn: 0, fn: 0, avgProb: 0, buckets: [0, 0, 0, 0, 0] },
                    total: Number(data.total ?? 0),
                    totalPages: Math.max(1, Number(data.totalPages ?? 1)),
                };

                pageCacheRef.current.set(cacheKey, normalized);
                setRows(normalized.rows);
                setSummary(normalized.summary);
                setTotal(normalized.total);
                setTotalPages(normalized.totalPages);
            } catch (fetchError) {
                if (!mounted) return;
                setRows([]);
                setSummary({ tp: 0, fp: 0, tn: 0, fn: 0, avgProb: 0, buckets: [0, 0, 0, 0, 0] });
                setTotal(0);
                setTotalPages(1);
                setError(fetchError?.message ?? 'Failed to load predictions');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchPage();

        return () => {
            mounted = false;
        };
    }, [page, pageSize, sortBy, sortDir]);

    const toggleSort = (column) => {
        setPage(1);
        if (sortBy === column) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(column);
            setSortDir('asc');
        }
    };

    const sortIndicator = (column) => {
        if (sortBy !== column) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    const classStyle = useMemo(() => ({
        'True Positive': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'False Positive': 'bg-amber-50  text-amber-700  border-amber-200',
        'True Negative': 'bg-slate-50  text-slate-600  border-slate-200',
        'False Negative': 'bg-rose-50   text-rose-700   border-rose-200',
    }), []);

    const buckets = Array.isArray(summary.buckets) && summary.buckets.length === 5 ? summary.buckets : [0, 0, 0, 0, 0];
    const maxB = Math.max(...buckets, 1);
    const defaultCalibration = [
        { bin: '0-20%', avgPred: 0, actualRate: 0, count: 0 },
        { bin: '20-40%', avgPred: 0, actualRate: 0, count: 0 },
        { bin: '40-60%', avgPred: 0, actualRate: 0, count: 0 },
        { bin: '60-80%', avgPred: 0, actualRate: 0, count: 0 },
        { bin: '80-100%', avgPred: 0, actualRate: 0, count: 0 },
    ];
    const calibration = Array.isArray(summary.calibration) && summary.calibration.length > 0
        ? summary.calibration
        : defaultCalibration;
    const reliabilityMax = Math.max(
        0.0001,
        ...calibration.map((c) => Math.max(Number(c.avgPred ?? 0), Number(c.actualRate ?? 0)))
    );
    const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRow = Math.min(page * pageSize, total);

    return (
        <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl flex-shrink-0">🎯</div>
                    <div>
                        <h3 className="text-base font-black text-slate-900">Future Buyer Predictor — ML.PREDICT Output</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Logistic Regression · Predicting return-visit purchase probability from first-session behaviour</p>
                    </div>
                </div>
                <span className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full text-xs font-mono flex-shrink-0">
                    {total} sessions
                </span>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                    Failed to load predictions from BigQuery: {error}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                    <span className="text-sm font-black text-slate-700 uppercase tracking-wider">P(buy=1) Distribution</span>
                    <div className="flex flex-col gap-2 flex-1 justify-center">
                        {buckets.map((count, i) => {
                            const labels = ['0–20%', '20–40%', '40–60%', '60–80%', '80–100%'];
                            const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981'];
                            return (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-semibold w-16 flex-shrink-0 whitespace-nowrap">{labels[i]}</span>
                                    <div className="w-[72%] bg-slate-100 rounded-full h-4 overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500 flex items-center pl-2"
                                            style={{ width: `${(count / maxB) * 100}%`, backgroundColor: colors[i] }}>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-slate-800 w-8 text-right flex-shrink-0 whitespace-nowrap">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                    <span className="text-sm font-black text-slate-700 uppercase tracking-wider">Calibration / Reliability</span>
                    <div className="flex flex-col gap-2 flex-1 justify-center">
                        {calibration.map((c) => {
                            const avgPred = Number(c.avgPred ?? 0);
                            const actualRate = Number(c.actualRate ?? 0);
                            return (
                                <div key={c.bin} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-semibold w-16 flex-shrink-0 whitespace-nowrap">{c.bin.replace('-', '–')}</span>
                                    <div className="w-[72%] bg-slate-100 rounded-full h-5 overflow-hidden relative">
                                        <div
                                            className="h-full bg-indigo-300/70"
                                            style={{ width: `${(avgPred / reliabilityMax) * 100}%` }}
                                            title={`Predicted ${(avgPred * 100).toFixed(1)}%`}
                                        />
                                        <div
                                            className="absolute top-0 h-full w-[3px] bg-indigo-700"
                                            style={{ left: `${Math.max(0, Math.min(100, (actualRate / reliabilityMax) * 100))}%` }}
                                            title={`Actual ${(actualRate * 100).toFixed(1)}%`}
                                        />
                                    </div>
                                    <span className="text-xs font-black text-slate-800 w-14 text-right flex-shrink-0 whitespace-nowrap">
                                        {(actualRate * 100).toFixed(1)}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-indigo-300/70"></span> Predicted</span>
                        <span className="inline-flex items-center gap-1"><span className="w-1 h-3 rounded-sm bg-indigo-700"></span> Actual</span>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-700 uppercase tracking-wider">Session Predictions</span>
                    <span className="text-xs text-slate-400">
                        {total === 0 ? '0 rows' : `${startRow}-${endRow} of ${total} rows`}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <th className="py-3 px-3 w-[14%]">
                                    <button type="button" onClick={() => toggleSort('unique_session_id')} className="inline-flex items-center gap-1">
                                        Session ID <span>{sortIndicator('unique_session_id')}</span>
                                    </button>
                                </th>
                                <th className="py-3 px-3 text-center w-[11%]">
                                    <button type="button" onClick={() => toggleSort('prob')} className="inline-flex items-center gap-1 justify-center w-full">
                                        Buy Prob <span>{sortIndicator('prob')}</span>
                                    </button>
                                </th>
                                <th className="py-3 px-3 text-center w-[8%]">Predicted</th>
                                <th className="py-3 px-3 text-center w-[8%]">Actual</th>
                                <th className="py-3 px-3 text-center w-[12%]">
                                    <button type="button" onClick={() => toggleSort('classification')} className="inline-flex items-center gap-1 justify-center w-full">
                                        Classification <span>{sortIndicator('classification')}</span>
                                    </button>
                                </th>
                                <th className="py-3 px-3 text-right w-[9%]">
                                    <button type="button" onClick={() => toggleSort('time_on_site')} className="inline-flex items-center gap-1 justify-end w-full">
                                        Time on Site <span>{sortIndicator('time_on_site')}</span>
                                    </button>
                                </th>
                                <th className="py-3 px-3 text-right w-[7%]">
                                    <button type="button" onClick={() => toggleSort('pageviews')} className="inline-flex items-center gap-1 justify-end w-full">
                                        Pageviews <span>{sortIndicator('pageviews')}</span>
                                    </button>
                                </th>
                                <th className="py-3 px-3 text-center w-[9%]">
                                    <button type="button" onClick={() => toggleSort('latest_ecommerce_progress')} className="inline-flex items-center gap-1 justify-center w-full">
                                        Ecomm Progress <span>{sortIndicator('latest_ecommerce_progress')}</span>
                                    </button>
                                </th>
                                <th className="py-3 px-3 text-center w-[7%]">Bounced</th>
                                <th className="py-3 px-3 w-[8%]">
                                    <button type="button" onClick={() => toggleSort('source')} className="inline-flex items-center gap-1">
                                        Source <span>{sortIndicator('source')}</span>
                                    </button>
                                </th>
                                <th className="py-3 px-3 text-right w-[7%]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={11} className="py-10 text-center text-slate-400 text-sm font-medium">Loading predictions...</td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-10 text-center text-slate-400 text-sm font-medium">No prediction records found.</td>
                                </tr>
                            ) : rows.map((row, idx) => (
                                <tr key={row.unique_session_id || idx} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-3 px-3 font-mono text-xs text-slate-500 truncate max-w-0">{row.unique_session_id}</td>

                                    <td className="py-3 px-3">
                                        <div className="flex items-center gap-2 justify-center">
                                            <span className="text-xs font-black text-slate-800 w-9 text-right flex-shrink-0">{(row.prob * 100).toFixed(1)}%</span>
                                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden flex-shrink-0">
                                                <div className="h-full rounded-full"
                                                    style={{ width: `${row.prob * 100}%`, backgroundColor: row.prob >= 0.6 ? '#10b981' : row.prob >= 0.5 ? '#f59e0b' : '#94a3b8' }}
                                                />
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-3 px-3 text-center">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${row.predicted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {row.predicted ? '1 — Buy' : '0 — No Buy'}
                                        </span>
                                    </td>

                                    <td className="py-3 px-3 text-center">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${row.actual ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {row.actual ? '1 — Buy' : '0 — No Buy'}
                                        </span>
                                    </td>

                                    <td className="py-3 px-3 text-center">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${classStyle[row.classification]}`}>
                                            {row.classification}
                                        </span>
                                    </td>

                                    <td className="py-3 px-3 text-right font-semibold text-slate-700 tabular-nums">{Number(row.time_on_site).toLocaleString()}s</td>
                                    <td className="py-3 px-3 text-right text-slate-600 tabular-nums">{row.pageviews}</td>

                                    <td className="py-3 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {[1, 2, 3, 4, 5, 6].map(step => (
                                                <div key={step} className={`w-2 h-2 rounded-full ${Number(row.latest_ecommerce_progress) >= step ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                                            ))}
                                        </div>
                                    </td>

                                    <td className="py-3 px-3 text-center">
                                        <span className={`text-xs font-bold ${row.bounces === '1' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {row.bounces === '1' ? '✗ Yes' : '✓ No'}
                                        </span>
                                    </td>

                                    <td className="py-3 px-3 text-xs text-slate-500 truncate max-w-0">{row.source}</td>

                                    <td className="py-3 px-3 text-right">
                                        {row.classification === 'False Positive' ? (
                                            <button
                                                onClick={() => setActionNotify(`Retargeting session ${row.unique_session_id.slice(0, 8)}… with 10% SokoAI voucher`)}
                                                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm transition-all"
                                            >
                                                Retarget
                                            </button>
                                        ) : row.classification === 'True Positive' ? (
                                            <button
                                                onClick={() => setActionNotify(`Enrolling ${row.unique_session_id.slice(0, 8)} in loyalty beta track`)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm transition-all"
                                            >
                                                Loyalty Sync
                                            </button>
                                        ) : (
                                            <span className="text-slate-300 text-xs">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs text-slate-500 font-medium">Page {page} of {Math.max(totalPages, 1)}</div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Rows</label>
                        <select
                            className="border border-slate-200 rounded-md px-2 py-1 text-xs"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1 || loading}
                            className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-40"
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
