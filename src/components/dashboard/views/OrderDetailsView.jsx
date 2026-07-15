import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];
const STATUS_COLORS = { delivered: '#10b981', confirmed: '#0ea5e9', shipped: '#6366f1', pending: '#f59e0b', cancelled: '#ef4444' };
const PAYMENT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7'];

const formatCurrency = (val) => "KES " + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatK = (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val.toFixed(0);

export function OrderDetailsView({
  hasActiveFilters,
  filteredOrders,
  paymentData,
  categoryData,
  statusData,
  topProductsData,
  revenueByCategoryDate
}) {
  // Constants derived for this view
  const paymentTotal = paymentData.reduce((s, [, v]) => s + v, 0) || 1;
  const categoryMax = categoryData[0]?.[1] || 1;
  const categoryTotal = categoryData.reduce((s, [, v]) => s + v, 0) || 1;
  const statusMax = statusData[0]?.[1] || 1;
  const topProductMax = topProductsData[0]?.[1] || 1;

  // Pie segments for payment mix
  const pieSegments = useMemo(() => {
    const toPoint = (angleDeg) => {
      const angle = (angleDeg - 90) * (Math.PI / 180);
      return {
        x: 18 + 14 * Math.cos(angle),
        y: 18 + 14 * Math.sin(angle),
      };
    };

    let startAngle = 0;
    return paymentData.map(([method, count], i) => {
      const pct = (count / paymentTotal) * 100;
      const sweep = (pct / 100) * 360;
      const endAngle = startAngle + sweep;
      const start = toPoint(startAngle);
      const end = toPoint(endAngle);
      const largeArcFlag = sweep > 180 ? 1 : 0;
      const path = `M 18 18 L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A 14 14 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
      const midAngle = startAngle + (sweep / 2);
      const labelPoint = (() => {
        const angle = (midAngle - 90) * (Math.PI / 180);
        return {
          x: 18 + 8.5 * Math.cos(angle),
          y: 18 + 8.5 * Math.sin(angle),
        };
      })();

      const seg = {
        method,
        count,
        pct,
        color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
        path,
        fullCircle: sweep >= 359.999,
        labelX: labelPoint.x,
        labelY: labelPoint.y,
      };

      startAngle = endAngle;
      return seg;
    });
  }, [paymentData, paymentTotal]);

  return (
    <div className="space-y-6">

      {/* --- SECTION 1: REVENUE CHARTS --- */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-base font-black text-[#2563eb]">Revenue</span>
          <div className="flex-1 h-[1.5px] bg-[#2563eb]/20"></div>
          {hasActiveFilters && (
            <span className="text-xs text-indigo-500 font-bold">{filteredOrders.length} filtered rows</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1: Payment Method Donut */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col gap-2">
            <div className="-mx-3 -mt-3 mb-1 px-3 py-2 rounded-t-2xl bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <span className="text-white text-[11px] font-extrabold uppercase tracking-[0.12em]">Payment Mix</span>
              <span className="text-xs text-slate-300 font-semibold">{filteredOrders.length} orders</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="relative flex-shrink-0">
                <svg className="w-48 h-48" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="#f1f5f9" />
                  {pieSegments.map((seg, i) => (
                    seg.fullCircle ? (
                      <circle key={i} cx="18" cy="18" r="14" fill={seg.color} />
                    ) : (
                      <path
                        key={i}
                        d={seg.path}
                        fill={seg.color}
                      />
                    )
                  ))}
                  {pieSegments.map((seg, i) => (
                    seg.pct >= 6 ? (
                      <text
                        key={`label-${i}`}
                        x={seg.labelX}
                        y={seg.labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-white font-black"
                        style={{ fontSize: '2.4px' }}
                      >
                        {seg.pct.toFixed(0)}%
                      </text>
                    ) : null
                  ))}
                </svg>
              </div>
              <div className="w-full flex flex-wrap gap-x-3 gap-y-1.5">
                {pieSegments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }}></span>
                    <span className="text-[11px] text-slate-600 font-semibold truncate">{seg.method}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Category Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="-mx-5 -mt-5 mb-1 px-5 py-3 rounded-t-2xl bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <span className="text-white text-[11px] font-extrabold uppercase tracking-[0.12em]">By Category</span>
              <span className="text-xs text-slate-300 font-semibold">items</span>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {categoryData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-300 text-xs">No data</div>
              ) : categoryData.map(([cat, count], i) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold w-20 truncate flex-shrink-0 whitespace-nowrap">{cat.split(' ')[0]}</span>
                  <div className="w-[62%] bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(count / categoryMax) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-800 w-8 text-right flex-shrink-0 whitespace-nowrap">{count}</span>
                </div>
              ))}
            </div>
            {categoryData.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                {categoryData.map(([cat, count], i) => (
                  <span key={cat}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border capitalize"
                    style={{ color: CHART_COLORS[i % CHART_COLORS.length], borderColor: CHART_COLORS[i % CHART_COLORS.length] + '40', backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '18' }}
                  >
                    {((count / categoryTotal) * 100).toFixed(0)}% {cat.split(' ')[0]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Status Distribution */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="-mx-5 -mt-5 mb-1 px-5 py-3 rounded-t-2xl bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <span className="text-white text-[11px] font-extrabold uppercase tracking-[0.12em]">Order Status</span>
              <span className="text-xs text-slate-300 font-semibold">count</span>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {statusData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-300 text-xs">No data</div>
              ) : statusData.map(([status, count]) => {
                const color = STATUS_COLORS[status] || '#94a3b8';
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className="text-xs font-semibold w-20 truncate flex-shrink-0 capitalize whitespace-nowrap" style={{ color }}>{status}</span>
                    <div className="w-[62%] bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(count / statusMax) * 100}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-800 w-8 text-right flex-shrink-0 whitespace-nowrap">{count}</span>
                  </div>
                );
              })}
            </div>
            {filteredOrders.length > 0 && statusData.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                {statusData.map(([status, count]) => (
                  <span key={status}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border capitalize"
                    style={{ color: STATUS_COLORS[status] || '#64748b', borderColor: (STATUS_COLORS[status] || '#94a3b8') + '40', backgroundColor: (STATUS_COLORS[status] || '#94a3b8') + '18' }}
                  >
                    {((count / filteredOrders.length) * 100).toFixed(0)}% {status}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Live Revenue KPIs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="-mx-5 -mt-5 mb-1 px-5 py-3 rounded-t-2xl bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <span className="text-white text-[11px] font-extrabold uppercase tracking-[0.12em]">Revenue KPIs</span>
              <span className="text-xs text-slate-300 font-semibold">{hasActiveFilters ? 'filtered' : 'all data'}</span>
            </div>
            {(() => {
              // When using the 10-row sample with no filters, use the real full-dataset figures
              const fRev = filteredOrders.reduce((a, o) => a + parseFloat(o.unit_cost || 0) * parseInt(o.quantity || 1, 10), 0);
              const fOrderCnt = new Set(filteredOrders.map(o => o.order_number)).size;
              const fAOV = fOrderCnt ? fRev / fOrderCnt : 0;
              const fCustomers = new Set(filteredOrders.map(o => o.customer_name).filter(Boolean)).size;
              return (
                <div className="flex flex-col gap-2 flex-1">
                  <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                    <span className="text-xs text-indigo-500 font-bold uppercase tracking-widest block">Revenue</span>
                    <span className="text-sm font-black text-indigo-700 block mt-0.5">{formatCurrency(fRev)}</span>
                  </div>
                  <div className="bg-sky-50 rounded-xl p-3 border border-sky-100">
                    <span className="text-xs text-sky-500 font-bold uppercase tracking-widest block">Avg Order Value</span>
                    <span className="text-sm font-black text-sky-700 block mt-0.5">{formatCurrency(fAOV)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Orders</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block">{fOrderCnt.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Customers</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block">{fCustomers.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      {/* --- SECTION 2: TRENDS & LEADERBOARDS --- */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-base font-black text-[#2563eb]">Trends</span>
          <div className="flex-1 h-[1.5px] bg-[#2563eb]/20"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Card 5: Revenue Trends (two charts) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col gap-4">
            <div className="-mx-5 -mt-5 mb-1 px-5 py-3 rounded-t-2xl bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <span className="text-white text-[11px] font-extrabold uppercase tracking-[0.12em]">Revenue Trends</span>
              <span className="text-xs text-slate-300 font-semibold">{revenueByCategoryDate.allDates.length} days</span>
            </div>

            {revenueByCategoryDate.allDates.length < 2 || revenueByCategoryDate.lines.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-300 text-sm py-10">
                Not enough date range data to plot
              </div>
            ) : (() => {
              const { lines, allDates } = revenueByCategoryDate;
              const totalSeries = allDates.map((date, idx) => {
                const total = lines.reduce((sum, line) => sum + Number(line.points?.[idx]?.[1] ?? 0), 0);
                return [date, total];
              });

              const methodTotals = lines
                .map((line) => ({
                  name: line.category,
                  value: line.points.reduce((sum, [, v]) => sum + Number(v ?? 0), 0),
                }))
                .sort((a, b) => b.value - a.value);

              const maxTotal = Math.max(1, ...totalSeries.map(([, v]) => Number(v ?? 0)));
              const maxMethod = Math.max(1, ...methodTotals.map((m) => m.value));
              const firstTotal = Number(totalSeries[0]?.[1] ?? 0);
              const lastTotal = Number(totalSeries[totalSeries.length - 1]?.[1] ?? 0);
              const trendPct = firstTotal === 0 ? 0 : ((lastTotal - firstTotal) / firstTotal) * 100;
              const isTrendUp = trendPct >= 0;

              const totalRevenueData = totalSeries.map(([date, revenue]) => ({
                date,
                revenue: Number(revenue ?? 0),
              }));

              const paymentRevenueData = methodTotals.map((item) => ({
                method: item.name,
                revenue: Number(item.value ?? 0),
              }));

              const renderChartTooltip = ({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg shadow-slate-900/10">
                    <p className="mb-1 text-xs font-medium text-[#64748B]">{label}</p>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(payload[0].value)}</p>
                  </div>
                );
              };

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 shadow-[inset_0_1px_0_#ffffff]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-black uppercase tracking-wider text-[#64748B]">Total Revenue Over Time</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isTrendUp ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#DC2626] bg-[#FEF2F2] border-[#DC2626]/20'}`}>
                        {isTrendUp ? '▲' : '▼'} {Math.abs(trendPct).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={totalRevenueData} margin={{ top: 8, right: 4, left: 10, bottom: 16 }}>
                          <defs>
                            <linearGradient id="trendAreaFill" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.10} />
                              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.01} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                            tick={{ fill: '#64748B', fontSize: 10 }}
                            tickFormatter={(value) => {
                              const d = new Date(value);
                              if (Number.isNaN(d.getTime())) return value;
                              return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
                            }}
                            angle={-32}
                            textAnchor="end"
                            tickMargin={10}
                            height={46}
                          />
                          <YAxis
                            domain={[0, maxTotal * 1.08]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 10 }}
                            tickFormatter={(value) => formatK(value)}
                            width={36}
                          />
                          <Tooltip content={renderChartTooltip} cursor={{ stroke: '#93c5fd', strokeWidth: 1 }} />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#2563EB"
                            strokeWidth={1}
                            fill="url(#trendAreaFill)"
                            activeDot={{ r: 3, fill: '#2563EB', stroke: '#fff', strokeWidth: 1.5 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#64748B] font-semibold mt-1">
                      <span>{allDates[0]}</span>
                      <span>{allDates[allDates.length - 1]}</span>
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 shadow-[inset_0_1px_0_#ffffff]">
                    <div className="text-xs font-black uppercase tracking-wider text-[#64748B] mb-2">Revenue By Payment Method</div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentRevenueData} margin={{ top: 8, right: 4, left: 10, bottom: 0 }} barCategoryGap="30%">
                          <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                          <XAxis
                            dataKey="method"
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            tick={{ fill: '#64748B', fontSize: 11 }}
                            tickFormatter={(value) => String(value).replace(/_/g, '').slice(0, 6).toUpperCase()}
                            dy={10}
                          />
                          <YAxis
                            domain={[0, maxMethod * 1.12]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 10 }}
                            tickFormatter={(value) => formatK(value)}
                            width={36}
                          />
                          <Tooltip content={renderChartTooltip} cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="revenue" radius={[7, 7, 2, 2]}>
                            {paymentRevenueData.map((entry, idx) => (
                              <Cell key={entry.method} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Card 6: Top Products by Revenue — data-driven */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-1 flex flex-col gap-3">
            <div className="-mx-5 -mt-5 mb-1 px-5 py-3 rounded-t-2xl bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <span className="text-white text-[11px] font-extrabold uppercase tracking-[0.12em]">Top Products</span>
              <span className="text-xs text-slate-300 font-semibold">by revenue</span>
            </div>
            {topProductsData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-300 text-xs">No data</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {topProductsData.map(([name, rev], i) => (
                  <div key={name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 truncate flex-1">{name}</span>
                      <span className="text-xs font-black text-slate-900 flex-shrink-0">{formatK(rev)}</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(rev / topProductMax) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- SECTION 3: FILTERED ORDERS TABLE --- */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-base font-black text-[#2563eb]">Orders</span>
          <div className="flex-1 h-[1.5px] bg-[#2563eb]/20"></div>
          {hasActiveFilters && (
            <span className="text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
              Filtered: {filteredOrders.length} rows
            </span>
          )}
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <span className="text-white text-[11px] font-extrabold uppercase tracking-[0.12em]">Orders Table</span>
            <span className="text-xs text-slate-300 font-semibold">{filteredOrders.length} rows</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 text-sm font-medium">
                      No orders match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.slice(0, 50).map((order, idx) => {
                    const statusColors = {
                      delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
                      shipped: 'bg-violet-50 text-violet-700 border-violet-200',
                      pending: 'bg-amber-50 text-amber-700 border-amber-200',
                      cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
                    };
                    const statusClass = statusColors[order.status] || 'bg-slate-100 text-slate-600 border-slate-200';
                    const paymentIcons = {
                      MPESA: '📱', M_PESA: '📱', CASH: '💵',
                      VISA: '💳', MASTERCARD: '💳', BANK_TRANSFER: '🏦',
                    };
                    const payIcon = paymentIcons[order.payment_method] || '💳';
                    const orderDateStr = order.order_date
                      ? new Date(order.order_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 truncate max-w-[140px]">{order.order_number}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{order.customer_name}</td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]">{order.product_name}</td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold px-2 py-0.5 rounded-full">{order.category}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{order.city}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`border text-xs font-bold px-2 py-0.5 rounded-full capitalize ${statusClass}`}>{order.status}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-600">
                            {payIcon} {order.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800 tabular-nums">
                          {Number(order.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 font-semibold">{order.quantity}</td>
                        <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">{orderDateStr}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredOrders.length > 50 && (
            <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 font-medium text-center">
              Showing 50 of {filteredOrders.length} matching rows. Apply filters to narrow results.
            </div>
          )}
        </div>
      </div >

    </div >
  );
}
