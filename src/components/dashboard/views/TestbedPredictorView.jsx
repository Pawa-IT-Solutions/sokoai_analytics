import { useState } from 'react';

export function TestbedPredictorView() {
    const [sessionId, setSessionId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const handlePredict = async () => {
        const cleanId = sessionId.trim();
        if (!cleanId) {
            setError('Enter a session ID first.');
            setResult(null);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/testbed-predict?sessionId=${encodeURIComponent(cleanId)}`);
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.error || payload?.details || `HTTP ${response.status}`);
            }

            setResult(payload);
        } catch (fetchError) {
            setResult(null);
            setError(fetchError?.message ?? 'Prediction failed');
        } finally {
            setIsLoading(false);
        }
    };

    const probability = Number(result?.purchaseProbability ?? 0);
    const isHighProbability = probability >= 0.5 || Boolean(result?.willPurchaseNextVisit);
    const features = result?.features ?? {};
    const timeOnSite = Number(features.time_on_site ?? 0);
    const pageviews = Number(features.pageviews ?? 0);
    const ecommProgress = Number(features.latest_ecommerce_progress ?? 0);
    const bouncedRaw = String(features.bounces ?? '').toLowerCase();
    const bounced = bouncedRaw === '1' || bouncedRaw === 'true' || bouncedRaw === 'yes';
    const source = features.source || 'unknown';

    const getRecommendedAction = () => {
        if (!result) return '';

        if (result.willPurchaseNextVisit) {
            return 'High-intent session: trigger a short-window retargeting flow (email/SMS) with viewed-product reminders and simplified checkout links.';
        }

        if (bounced && timeOnSite < 30) {
            return 'Low-engagement bounce: prioritize a top-of-funnel action such as a landing-page offer or educational creative before pushing a conversion CTA.';
        }

        if (ecommProgress >= 4) {
            return 'Mid-funnel drop-off: send cart or checkout nudges with trust signals (delivery SLA, returns policy, payment reassurance) to recover intent.';
        }

        return 'Low-to-moderate intent: retarget with category-level recommendations and a light incentive to drive another engaged visit.';
    };

    return (
        <section className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-base font-black text-slate-900">Prediction Testbed</h3>
                <p className="text-xs text-slate-500 mt-1">
                    Enter a session ID and run ML.PREDICT against model
                    {' '}
                    <span className="font-semibold">classification_model_2</span>
                    .
                </p>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        placeholder="Example: 123456789"
                        className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                    />
                    <button
                        type="button"
                        onClick={handlePredict}
                        disabled={isLoading}
                        className={`px-4 py-2.5 rounded-lg text-sm font-bold border transition ${isLoading
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                            }`}
                    >
                        {isLoading ? 'Predicting...' : 'Run Prediction'}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}
            </div>

            {result && (
                <div className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 ${isHighProbability
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : 'border-rose-300 ring-1 ring-rose-200'
                    }`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <div>
                            <p className="text-xs text-slate-500">Session ID</p>
                            <p className="text-sm font-bold text-slate-900">{result.sessionId}</p>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${result.willPurchaseNextVisit
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            {result.willPurchaseNextVisit ? 'Likely To Purchase' : 'Unlikely To Purchase'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Purchase Probability</p>
                            <p className="text-lg font-black text-slate-900">{(probability * 100).toFixed(2)}%</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Predicted Label</p>
                            <p className="text-lg font-black text-slate-900">{result.predictedLabel}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Model</p>
                            <p className="text-sm font-bold text-slate-900 break-all">{result.model}</p>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 space-y-3">
                        <h4 className="text-sm font-black text-slate-900">Why This Prediction</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <p className="text-xs text-slate-500">Time on Site</p>
                                <p className="text-base font-bold text-slate-900">{timeOnSite.toLocaleString()}s</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <p className="text-xs text-slate-500">Pageviews</p>
                                <p className="text-base font-bold text-slate-900">{pageviews.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <p className="text-xs text-slate-500">Ecomm Progress</p>
                                <p className="text-base font-bold text-slate-900">{ecommProgress.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <p className="text-xs text-slate-500">Bounced</p>
                                <p className={`text-base font-bold ${bounced ? 'text-rose-700' : 'text-emerald-700'}`}>{bounced ? 'Yes' : 'No'}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <p className="text-xs text-slate-500">Source</p>
                                <p className="text-base font-bold text-slate-900 break-all">{source}</p>
                            </div>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wide">Action</p>
                            <p className="text-sm text-slate-800 mt-1 leading-relaxed">{getRecommendedAction()}</p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
