import React, { useState } from 'react';
import { Sidebar } from './components/dashboard/Sidebar';
import { Header } from './components/dashboard/Header';
import { KPIRow } from './components/dashboard/KPIRow';
import { OrderDetailsView } from './components/dashboard/views/OrderDetailsView';
import { CustomerSegmentsView } from './components/dashboard/views/CustomerSegmentsView';
import { FutureBuyerPredictorView } from './components/dashboard/views/FutureBuyerPredictorView';
import { useDashboardData } from './hooks/useDashboardData';
import { useSegmentAICopy } from './hooks/useSegmentAICopy';

export default function SokoAIDashboard() {
    const [activeTab, setActiveTab] = useState('orders');
    const [selectedSegment, setSelectedSegment] = useState(1);
    const [actionNotify, setActionNotify] = useState('');
    const [isSendingReport, setIsSendingReport] = useState(false);
    const isReportTriggerEnabled = false;

    const handleTriggerReport = async () => {
        if (isSendingReport) return;

        setIsSendingReport(true);
        setActionNotify('Sending retargeting report request...');

        try {
            const response = await fetch('https://soko-report-659303448426.us-central1.run.app', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            setActionNotify('Retargeting report triggered successfully. Check your inbox shortly.');
        } catch (error) {
            setActionNotify(`Failed to trigger retargeting report: ${error?.message ?? 'Unknown error'}`);
        } finally {
            setIsSendingReport(false);
        }
    };

    const {
        filterCategory, setFilterCategory,
        filterStatus, setFilterStatus,
        filterPayment, setFilterPayment,
        filterDateFrom, setFilterDateFrom,
        filterDateTo, setFilterDateTo,
        uniqueCategories, uniqueStatuses, uniquePayments,
        filteredOrders, hasActiveFilters, clearFilters,
        totalCustomers, totalRevenue, totalOrders, avgOrderValue,
        categoryData, paymentData, statusData, topProductsData, revenueByCategoryDate,
    } = useDashboardData();

    const {
        displaySegments,
        isLoadingAI,
        isRefreshingAI,
        aiError,
        lastGeneratedAt,
        loadAICopy,
    } = useSegmentAICopy();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans antialiased">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-10 space-y-6">
                    <Header
                        activeTab={activeTab}
                        filterCategory={filterCategory}
                        setFilterCategory={setFilterCategory}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        filterPayment={filterPayment}
                        setFilterPayment={setFilterPayment}
                        filterDateFrom={filterDateFrom}
                        setFilterDateFrom={setFilterDateFrom}
                        filterDateTo={filterDateTo}
                        setFilterDateTo={setFilterDateTo}
                        uniqueCategories={uniqueCategories}
                        uniqueStatuses={uniqueStatuses}
                        uniquePayments={uniquePayments}
                        hasActiveFilters={hasActiveFilters}
                        clearFilters={clearFilters}
                        filteredOrdersLength={filteredOrders.length}
                    />

                    {activeTab === 'model1' && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl flex-shrink-0">🎯</div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Predict Visitor Purchases — ML.PREDICT Output</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Logistic Regression · Predicting return-visit purchase probability from first-session behaviour</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={isReportTriggerEnabled ? handleTriggerReport : undefined}
                                className="px-4 py-2 rounded-lg text-sm font-bold border transition bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                                style={!isReportTriggerEnabled ? { pointerEvents: 'none' } : undefined}
                            >
                                {isSendingReport ? 'Triggering report...' : 'Send Retargeting Report'}
                            </button>
                        </div>
                    )}

                    <KPIRow
                        activeTab={activeTab}
                        totalCustomers={totalCustomers}
                        totalRevenue={totalRevenue}
                        totalOrders={totalOrders}
                        avgOrderValue={avgOrderValue}
                        model2Segments={displaySegments}
                    />

                    {actionNotify && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm shadow-sm animate-pulse">
                            <span>⚡</span> {actionNotify}
                        </div>
                    )}

                    {activeTab === 'model1' && (
                        <FutureBuyerPredictorView setActionNotify={setActionNotify} showHeader={false} />
                    )}

                    {activeTab === 'model2' && (
                        <CustomerSegmentsView
                            selectedSegment={selectedSegment}
                            setSelectedSegment={setSelectedSegment}
                            displaySegments={displaySegments}
                            isLoadingAI={isLoadingAI}
                            isRefreshingAI={isRefreshingAI}
                            aiError={aiError}
                            lastGeneratedAt={lastGeneratedAt}
                            onRefreshAICopy={() => loadAICopy(true)}
                        />
                    )}

                    {activeTab === 'orders' && (
                        <OrderDetailsView
                            hasActiveFilters={hasActiveFilters}
                            filteredOrders={filteredOrders}
                            paymentData={paymentData}
                            categoryData={categoryData}
                            statusData={statusData}
                            topProductsData={topProductsData}
                            revenueByCategoryDate={revenueByCategoryDate}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
