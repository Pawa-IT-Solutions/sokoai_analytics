import React, { useState } from 'react';
import { Sidebar } from './components/dashboard/Sidebar';
import { Header } from './components/dashboard/Header';
import { KPIRow } from './components/dashboard/KPIRow';
import { OrderDetailsView } from './components/dashboard/views/OrderDetailsView';
import { CustomerSegmentsView } from './components/dashboard/views/CustomerSegmentsView';
import { FutureBuyerPredictorView } from './components/dashboard/views/FutureBuyerPredictorView';
import { useDashboardData } from './hooks/useDashboardData';

export default function SokoAIDashboard() {
    const [activeTab, setActiveTab] = useState('orders');
    const [selectedSegment, setSelectedSegment] = useState(1);
    const [actionNotify, setActionNotify] = useState('');

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

                    <KPIRow
                        activeTab={activeTab}
                        totalCustomers={totalCustomers}
                        totalRevenue={totalRevenue}
                        totalOrders={totalOrders}
                        avgOrderValue={avgOrderValue}
                    />

                    {actionNotify && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm shadow-sm animate-pulse">
                            <span>⚡</span> {actionNotify}
                        </div>
                    )}

                    {activeTab === 'model1' && (
                        <FutureBuyerPredictorView setActionNotify={setActionNotify} />
                    )}

                    {activeTab === 'model2' && (
                        <CustomerSegmentsView
                            selectedSegment={selectedSegment}
                            setSelectedSegment={setSelectedSegment}
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
