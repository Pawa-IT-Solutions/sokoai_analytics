import { useState, useMemo, useEffect } from 'react';

export function useDashboardData() {
  const [ordersData, setOrdersData] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchFromBigQuery = async () => {
      try {
        const response = await fetch('/api/customer-order-details');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rows = await response.json();

        if (mounted) {
          setOrdersData(Array.isArray(rows) ? rows : []);
        }
      } catch {
        if (mounted) setOrdersData([]);
      }
    };

    fetchFromBigQuery();
    return () => {
      mounted = false;
    };
  }, []);

  const uniqueCategories = useMemo(() => [...new Set(ordersData.map(o => o.category).filter(Boolean))].sort(), [ordersData]);
  const uniqueStatuses = useMemo(() => [...new Set(ordersData.map(o => o.status).filter(Boolean))].sort(), [ordersData]);
  const uniquePayments = useMemo(() => [...new Set(ordersData.map(o => o.payment_method).filter(Boolean))].sort(), [ordersData]);

  const filteredOrders = useMemo(() => {
    return ordersData.filter(o => {
      if (filterCategory && o.category !== filterCategory) return false;
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterPayment && o.payment_method !== filterPayment) return false;
      if (filterDateFrom) {
        const orderDate = new Date(o.order_date);
        if (orderDate < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo) {
        const orderDate = new Date(o.order_date);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) return false;
      }
      return true;
    });
  }, [ordersData, filterCategory, filterStatus, filterPayment, filterDateFrom, filterDateTo]);

  const hasActiveFilters = Boolean(filterCategory || filterStatus || filterPayment || filterDateFrom || filterDateTo);

  const clearFilters = () => {
    setFilterCategory('');
    setFilterStatus('');
    setFilterPayment('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const totalCustomers = useMemo(() => new Set(ordersData.map(o => o.customer_name).filter(Boolean)).size, [ordersData]);

  const totalRevenue = useMemo(() => ordersData.reduce(
    (acc, cur) => acc + (parseFloat(cur.unit_cost || 0) * parseInt(cur.quantity || 1, 10)), 0
  ), [ordersData]);

  const totalOrders = useMemo(() => new Set(ordersData.map(o => o.order_number)).size, [ordersData]);

  const avgOrderValue = useMemo(() => {
    const orderTotals = {};
    ordersData.forEach(o => {
      const val = parseFloat(o.unit_cost || 0) * parseInt(o.quantity || 1, 10);
      orderTotals[o.order_number] = (orderTotals[o.order_number] || 0) + val;
    });
    const totals = Object.values(orderTotals);
    return totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  }, [ordersData]);

  const categoryData = useMemo(() => {
    const counts = {};
    filteredOrders.forEach(o => { counts[o.category] = (counts[o.category] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredOrders]);

  const paymentData = useMemo(() => {
    const counts = {};
    filteredOrders.forEach(o => { counts[o.payment_method] = (counts[o.payment_method] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredOrders]);

  const statusData = useMemo(() => {
    const counts = {};
    filteredOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredOrders]);

  const topProductsData = useMemo(() => {
    const rev = {};
    filteredOrders.forEach(o => {
      const val = parseFloat(o.unit_cost || 0) * parseInt(o.quantity || 1, 10);
      rev[o.product_name] = (rev[o.product_name] || 0) + val;
    });
    return Object.entries(rev).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredOrders]);

  const revenueByCategoryDate = useMemo(() => {
    const byMethod = {};
    filteredOrders.forEach(o => {
      const d = o.order_date ? o.order_date.slice(0, 10) : null;
      if (!d || !o.payment_method) return;
      const val = parseFloat(o.unit_cost || 0) * parseInt(o.quantity || 1, 10);
      if (!byMethod[o.payment_method]) byMethod[o.payment_method] = {};
      byMethod[o.payment_method][d] = (byMethod[o.payment_method][d] || 0) + val;
    });
    const allDates = [...new Set(filteredOrders.map(o => o.order_date ? o.order_date.slice(0, 10) : null).filter(Boolean))].sort();
    const lines = Object.entries(byMethod).map(([method, dateMap]) => ({
      category: method,
      points: allDates.map(d => [d, dateMap[d] || 0]),
    }));
    return { lines, allDates };
  }, [filteredOrders]);

  return {
    // Filter State
    filterCategory, setFilterCategory,
    filterStatus, setFilterStatus,
    filterPayment, setFilterPayment,
    filterDateFrom, setFilterDateFrom,
    filterDateTo, setFilterDateTo,
    // Unique options
    uniqueCategories, uniqueStatuses, uniquePayments,
    // Derived state
    filteredOrders, hasActiveFilters, clearFilters,
    // Aggregations
    totalCustomers, totalRevenue, totalOrders, avgOrderValue,
    categoryData, paymentData, statusData, topProductsData, revenueByCategoryDate
  };
}
