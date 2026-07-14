import React, { useMemo } from 'react';

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

  // Donut segments for payment pie
  const donutSegments = useMemo(() => {
    let offset = 25; // start at top
    return paymentData.map(([method, count], i) => {
      const pct = (count / paymentTotal) * 100;
      const seg = { method, count, pct, offset, color: PAYMENT_COLORS[i % PAYMENT_COLORS.length] };
      offset += pct;
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 text-sm font-black uppercase tracking-wider">Payment Mix</span>
              <span className="text-xs text-slate-400 font-semibold">{filteredOrders.length} orders</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                  {donutSegments.map((seg, i) => (
                    <circle key={i} cx="18" cy="18" r="14" fill="none"
                      stroke={seg.color} strokeWidth="5"
                      strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                      strokeDashoffset={100 - seg.offset}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[12px] font-black text-slate-700">{paymentData.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {donutSegments.slice(0, 5).map((seg, i) => (
                  <div key={i} className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }}></span>
                      <span className="text-xs text-slate-600 font-semibold truncate">{seg.method}</span>
                    </div>
                    <span className="text-xs font-black text-slate-800 flex-shrink-0">{seg.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Category Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 text-sm font-black uppercase tracking-wider">By Category</span>
              <span className="text-xs text-slate-400 font-semibold">items</span>
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
            <div className="flex items-center justify-between">
              <span className="text-slate-700 text-sm font-black uppercase tracking-wider">Order Status</span>
              <span className="text-xs text-slate-400 font-semibold">count</span>
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
            <div className="flex items-center justify-between">
              <span className="text-slate-700 text-sm font-black uppercase tracking-wider">Revenue KPIs</span>
              <span className="text-xs text-slate-400 font-semibold">{hasActiveFilters ? 'filtered' : 'all data'}</span>
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

          {/* Card 5: Revenue Over Time — broken down by category */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 text-sm font-black uppercase tracking-wider">Revenue Over Time by Payment Method</span>
              <span className="text-xs text-slate-400 font-semibold">{revenueByCategoryDate.allDates.length} days</span>
            </div>
            {revenueByCategoryDate.allDates.length < 2 || revenueByCategoryDate.lines.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-300 text-sm py-10">
                Not enough date range data to plot
              </div>
            ) : (() => {
              const { lines, allDates } = revenueByCategoryDate;
              const W = 500, H = 130, PAD_X = 8, PAD_Y = 10;
              const allRevValues = lines.flatMap(l => l.points.map(([, v]) => v));
              const maxRev = Math.max(...allRevValues, 1);

              const toPath = (points) => {
                const coords = points.map(([, v], i) => ({
                  x: PAD_X + (i / (allDates.length - 1)) * (W - PAD_X * 2),
                  y: H - PAD_Y - ((v / maxRev) * (H - PAD_Y * 2)),
                }));
                return coords.map((p, i) => {
                  if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                  const prev = coords[i - 1];
                  const cpx = ((prev.x + p.x) / 2).toFixed(1);
                  return `C${cpx},${prev.y.toFixed(1)} ${cpx},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                }).join(' ');
              };

              return (
                <>
                  <div className="relative h-36">
                    <svg className="w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                      {/* Grid lines */}
                      {[0.25, 0.5, 0.75, 1].map(f => (
                        <line key={f}
                          x1={PAD_X} y1={H - PAD_Y - f * (H - PAD_Y * 2)}
                          x2={W - PAD_X} y2={H - PAD_Y - f * (H - PAD_Y * 2)}
                          stroke="#f1f5f9" strokeWidth="1"
                        />
                      ))}
                      {/* One line per category */}
                      {lines.map((line, i) => (
                        <path
                          key={line.category}
                          d={toPath(line.points)}
                          fill="none"
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth="1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </svg>
                  </div>
                  {/* X-axis labels */}
                  <div className="flex justify-between text-xs text-slate-400 font-bold border-t border-slate-100 pt-2">
                    <span>{allDates[0]}</span>
                    {allDates.length > 2 && <span>{allDates[Math.floor(allDates.length / 2)]}</span>}
                    <span>{allDates[allDates.length - 1]}</span>
                  </div>
                  {/* Category legend */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-slate-100">
                    {lines.map((line, i) => (
                      <div key={line.category} className="flex items-center gap-1">
                        <span className="w-2.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></span>
                        <span className="text-xs text-slate-500 font-semibold">{line.category}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Card 6: Top Products by Revenue — data-driven */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-1 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 text-sm font-black uppercase tracking-wider">Top Products</span>
              <span className="text-xs text-slate-400 font-semibold">by revenue</span>
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
                      <div className="h-full rounded-full transition-all duration-500"
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
      </div>

    </div>
  );
}
