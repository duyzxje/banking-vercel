"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ORDER_STATUS_LABELS, ORDER_STATUS_SORT_WEIGHT, Order, OrderStatus, StatusCountEntry } from './OrderTypes';
import { OrderService } from './OrderService';
import OrderCreation from './OrderCreation';

const DEFAULT_LIMIT = 100000;

type TabType = 'create' | 'manage';

export default function OrderManagement() {
    const [activeTab, setActiveTab] = useState<TabType>('manage');
    const [orders, setOrders] = useState<Order[]>([]);
    const [statusCounts, setStatusCounts] = useState<StatusCountEntry[]>([]);
    const [totalRevenue, setTotalRevenue] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    // pagination removed on UI
    const limit = DEFAULT_LIMIT;
    const [search, setSearch] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchDeltaX, setTouchDeltaX] = useState<Record<number, number>>({});
    // giữ giá trị theo định dạng input datetime-local: YYYY-MM-DDTHH:mm
    const toInputLocal = (d: Date): string => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    };

    // Helper: default date range
    const getDefaultRange = () => {
        const now = new Date();
        const nowTruncated = new Date(now);
        nowTruncated.setSeconds(0, 0);
        const yesterdayStart = new Date(now);
        yesterdayStart.setDate(now.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        return {
            start: toInputLocal(yesterdayStart),
            end: toInputLocal(nowTruncated)
        };
    };

    // Load time range from localStorage hoặc dùng default
    const [startInput, setStartInput] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('orderManagement_startInput');
            if (saved) return saved;
        }
        return getDefaultRange().start;
    });
    const [endInput, setEndInput] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('orderManagement_endInput');
            if (saved) return saved;
        }
        return getDefaultRange().end;
    });

    // Lưu time range vào localStorage mỗi khi thay đổi
    useEffect(() => {
        if (typeof window === 'undefined' || !startInput || !endInput) return;
        localStorage.setItem('orderManagement_startInput', startInput);
        localStorage.setItem('orderManagement_endInput', endInput);
    }, [startInput, endInput]);
    // Modal state
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    type OrderItem = { content?: string; product_name?: string; quantity?: number; unit_price?: number; price?: number };
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [modalLoading, setModalLoading] = useState<boolean>(false);

    // chuyển thành định dạng SQL 'YYYY-MM-DD HH:mm:ss'
    const formatToSqlDatetime = (val?: string): string | undefined => {
        if (!val) return undefined;
        // val như '2025-09-02T09:30'
        const [datePart, timePart] = val.split('T');
        if (!datePart || !timePart) return undefined;
        const withSeconds = timePart.length === 5 ? `${timePart}:00` : timePart; // HH:mm -> HH:mm:ss
        return `${datePart} ${withSeconds}`; // backend sẽ parse chuỗi này
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await OrderService.listOrders({
                start: formatToSqlDatetime(startInput),
                end: formatToSqlDatetime(endInput),
                page: 1,
                limit,
                search,
                status: statusFilter
            });
            interface ListOrdersResponse { data?: Order[]; statusCounts?: StatusCountEntry[]; totalRevenue?: number }
            const resp = data as ListOrdersResponse;
            const list = Array.isArray(resp?.data) ? resp.data : [];
            const counts = Array.isArray(resp?.statusCounts) ? resp.statusCounts : [];
            const revenue = typeof resp?.totalRevenue === 'number' ? resp.totalRevenue : 0;
            setOrders(list);
            setStatusCounts(counts);
            setTotalRevenue(revenue);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [startInput, endInput, search, statusFilter, limit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // pagination removed

    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const wa = ORDER_STATUS_SORT_WEIGHT[a.status];
            const wb = ORDER_STATUS_SORT_WEIGHT[b.status];
            if (wa !== wb) return wa - wb;
            // fallback: newest first by created_at or id desc
            const aKey = a.created_at ? Date.parse(a.created_at) : a.id;
            const bKey = b.created_at ? Date.parse(b.created_at) : b.id;
            return bKey - aKey;
        });
    }, [orders]);

    const getStatusTint = (status: OrderStatus) => {
        switch (status) {
            case 'gap': return 'bg-red-50 border border-red-200';
            case 'di_don': return 'bg-yellow-50 border border-yellow-200';
            case 'chua_rep': return 'bg-blue-50 border border-blue-200';
            case 'giu_don': return 'bg-purple-50 border border-purple-200';
            case 'warning': return 'bg-orange-50 border border-orange-200';
            case 'hoan_thanh': return 'bg-emerald-50 border border-emerald-200';
            default: return '';
        }
    };

    const handleChangeStatus = async (orderId: number, nextStatus: OrderStatus) => {
        // optimistic update
        setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o)));
        try {
            await OrderService.updateStatus(orderId, nextStatus);
            // refresh counts only
            fetchData();
        } catch (err) {
            console.error(err);
            // revert on error
            setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: o.status } : o)));
        }
    };

    const handleDelete = async (orderId: number) => {
        if (!confirm('Xóa đơn hàng này?')) return;
        try {
            await OrderService.deleteOrder(orderId);
            setOrders(prev => prev.filter(o => o.id !== orderId));
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleViewOrder = async (order: Order) => {
        setSelectedOrder(order);
        setModalLoading(true);
        try {
            const orderDetail = await OrderService.getOrder(order.id);
            setOrderItems((orderDetail.items || []) as OrderItem[]);
        } catch (err) {
            console.error('Error loading order details:', err);
            setOrderItems([]);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedOrder(null);
        setOrderItems([]);
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <div className="border-b border-gray-200 mb-4">
                    <nav className="flex -mb-px space-x-4" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`${activeTab === 'manage'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            Quản lí đơn hàng
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`${activeTab === 'create'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            Tạo đơn hàng
                        </button>

                    </nav>
                </div>
            </div>

            {/* Create Orders Tab Content */}
            {activeTab === 'create' && <OrderCreation />}

            {/* Manage Orders Tab Content */}
            {activeTab === 'manage' && (
                <>
                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="font-semibold text-lg text-gray-800 mb-4">Bộ lọc</h3>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-gray-700 mb-1">Bắt đầu</label>
                                <input
                                    type="datetime-local"
                                    lang="en-GB"
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={startInput}
                                    onChange={e => setStartInput(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-gray-700 mb-1">Kết thúc</label>
                                <input
                                    type="datetime-local"
                                    lang="en-GB"
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={endInput}
                                    onChange={e => setEndInput(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
                                <input
                                    type="text"
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Tên, số tiền, sản phẩm..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); }}
                                />
                            </div>
                            <div className="flex md:justify-end">
                                <button
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                    onClick={() => fetchData()}
                                >
                                    Áp dụng lọc
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Total Revenue */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-lg text-gray-800 mb-1">Tổng doanh thu</h3>
                                <p className="text-sm text-gray-600">
                                    Theo khoảng thời gian đã chọn
                                    {statusFilter && ` · Trạng thái: ${ORDER_STATUS_LABELS[statusFilter as OrderStatus]}`}
                                    {search && ` · Tìm kiếm: "${search}"`}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-green-700">
                                    {totalRevenue.toLocaleString('vi-VN')} đ
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status summary */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="font-semibold text-lg text-gray-800 mb-4">Thống kê trạng thái</h3>
                        <div className="flex flex-wrap gap-3">
                            {(['gap', 'di_don', 'chua_rep', 'giu_don', 'warning', 'hoan_thanh'] as OrderStatus[]).map(st => {
                                const count = statusCounts.find(s => s.status === st)?.count ?? 0;
                                return (
                                    <button
                                        key={st}
                                        className={
                                            `px-4 py-2 rounded-lg border-2 font-medium transition-colors ` +
                                            (st === 'gap' ? (statusFilter === 'gap' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100') : '') +
                                            (st === 'di_don' ? (statusFilter === 'di_don' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100') : '') +
                                            (st === 'chua_rep' ? (statusFilter === 'chua_rep' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100') : '') +
                                            (st === 'giu_don' ? (statusFilter === 'giu_don' ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100') : '') +
                                            (st === 'warning' ? (statusFilter === 'warning' ? 'bg-orange-600 text-white border-orange-600' : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100') : '') +
                                            (st === 'hoan_thanh' ? (statusFilter === 'hoan_thanh' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100') : '')
                                        }
                                        onClick={() => setStatusFilter(prev => (prev === st ? '' : st))}
                                    >
                                        {ORDER_STATUS_LABELS[st]}: <span className="font-bold text-lg">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="font-semibold text-lg text-gray-800">Danh sách đơn hàng</h3>
                        </div>
                        <div className="overflow-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Khách</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Live</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading && (
                                        <tr><td className="px-6 py-4 text-center text-gray-500" colSpan={7}>Đang tải...</td></tr>
                                    )}
                                    {!loading && sortedOrders.length === 0 && (
                                        <tr><td className="px-6 py-4 text-center text-gray-500" colSpan={7}>Không có dữ liệu</td></tr>
                                    )}
                                    {!loading && sortedOrders.map(o => (
                                        <tr key={o.id} className={
                                            getStatusTint(o.status)
                                        }>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{o.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{o.customer_username}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{o.total_amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.live_date ? new Date(o.live_date).toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    value={o.status}
                                                    onChange={e => handleChangeStatus(o.id, e.target.value as OrderStatus)}
                                                >
                                                    <option value="gap">Gấp</option>
                                                    <option value="di_don">Đi đơn</option>
                                                    <option value="chua_rep">Chưa rep</option>
                                                    <option value="giu_don">Giữ đơn</option>
                                                    <option value="warning">Cảnh báo</option>
                                                    <option value="hoan_thanh">Hoàn thành</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        className="text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                                                        onClick={() => handleViewOrder(o)}
                                                    >
                                                        Xem
                                                    </button>
                                                    <button
                                                        className="text-red-600 hover:text-red-900 px-3 py-1 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                                                        onClick={() => handleDelete(o.id)}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card List */}
                    <div className="md:hidden bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden select-none">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h3 className="font-semibold text-base text-gray-800">Danh sách đơn hàng</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {loading && (
                                <div className="p-4 text-center text-gray-500">Đang tải...</div>
                            )}
                            {!loading && sortedOrders.length === 0 && (
                                <div className="p-4 text-center text-gray-500">Không có dữ liệu</div>
                            )}
                            {!loading && sortedOrders.map(o => {
                                const dx = touchDeltaX[o.id] || 0;
                                const leftOpacity = Math.min(Math.max(dx / 80, 0), 1);
                                const rightOpacity = Math.min(Math.max(-dx / 80, 0), 1);
                                return (
                                    <div key={o.id} className="relative">
                                        {/* Background cues */}
                                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                            <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-emerald-100" style={{ opacity: leftOpacity }}></div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-red-100" style={{ opacity: rightOpacity }}></div>
                                            <div className="absolute inset-0 flex items-center justify-between px-4">
                                                <div className="flex items-center gap-2 text-emerald-700" style={{ opacity: leftOpacity }}>
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                                    <span className="text-xs font-medium">Hoàn thành</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-red-700" style={{ opacity: rightOpacity }}>
                                                    <span className="text-xs font-medium">Xóa</span>
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Foreground card */}
                                        <div
                                            className={
                                                `relative px-4 py-3 rounded-md ` + getStatusTint(o.status)
                                            }
                                            onClick={() => handleViewOrder(o)}
                                            onTouchStart={(e) => {
                                                setTouchStartX(e.touches[0].clientX);
                                            }}
                                            onTouchMove={(e) => {
                                                if (touchStartX === null) return;
                                                const currentX = e.touches[0].clientX;
                                                const delta = currentX - touchStartX;
                                                setTouchDeltaX(prev => ({ ...prev, [o.id]: delta }));
                                            }}
                                            onTouchEnd={() => {
                                                const delta = touchDeltaX[o.id] || 0;
                                                setTouchStartX(null);
                                                setTouchDeltaX(prev => ({ ...prev, [o.id]: 0 }));
                                                if (delta <= -80) {
                                                    handleDelete(o.id);
                                                    return;
                                                }
                                                if (delta >= 80) {
                                                    handleChangeStatus(o.id, 'hoan_thanh');
                                                    return;
                                                }
                                            }}
                                            style={{ transform: `translateX(${dx}px)`, transition: touchStartX === null ? 'transform 0.15s ease-out' : 'none' }}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                {/* Left info */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-gray-900 truncate">#{o.id} · {o.customer_username}</div>
                                                    <div className="mt-2 space-y-0.5 text-xs text-gray-700">
                                                        <div className="truncate"><span className="text-gray-500">Tổng:</span> {o.total_amount.toLocaleString()} VNĐ</div>
                                                        <div className="truncate"><span className="text-gray-500">Tạo:</span> {o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '-'}</div>
                                                        <div className="truncate"><span className="text-gray-500">Live:</span> {o.live_date ? new Date(o.live_date).toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : '-'}</div>
                                                    </div>
                                                </div>
                                                {/* Right actions: status change */}
                                                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    <select
                                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                        value={o.status}
                                                        onChange={e => handleChangeStatus(o.id, e.target.value as OrderStatus)}
                                                    >
                                                        <option value="gap">Gấp</option>
                                                        <option value="di_don">Đi đơn</option>
                                                        <option value="chua_rep">Chưa rep</option>
                                                        <option value="giu_don">Giữ đơn</option>
                                                        <option value="warning">Cảnh báo</option>
                                                        <option value="hoan_thanh">Hoàn thành</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pagination removed */}

                    {/* Modal */}
                    {selectedOrder && (
                        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                                {/* Modal Header */}
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Chi tiết đơn hàng #{selectedOrder.id}
                                    </h3>
                                    <button
                                        onClick={closeModal}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                                    {modalLoading ? (
                                        <div className="flex justify-center items-center py-8">
                                            <div className="text-gray-500">Đang tải...</div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Order Info */}
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <h4 className="font-semibold text-gray-900 mb-3">Thông tin đơn hàng</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-sm text-gray-600">Khách hàng:</span>
                                                        <p className="font-medium">{selectedOrder.customer_username}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-gray-600">Tổng tiền:</span>
                                                        <p className="font-medium">{selectedOrder.total_amount.toLocaleString()} VNĐ</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-gray-600">Ngày live:</span>
                                                        <p className="font-medium">{selectedOrder.live_date ? new Date(selectedOrder.live_date).toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-gray-600">Trạng thái:</span>
                                                        <p className="font-medium">{ORDER_STATUS_LABELS[selectedOrder.status]}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-gray-600">Ngày tạo:</span>
                                                        <p className="font-medium">{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('vi-VN') : '-'}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center justify-end">
                                                    <label className="text-sm text-gray-600 mr-2">Thay đổi trạng thái:</label>
                                                    <select
                                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                        value={selectedOrder.status}
                                                        onChange={e => handleChangeStatus(selectedOrder.id, e.target.value as OrderStatus)}
                                                    >
                                                        <option value="gap">Gấp</option>
                                                        <option value="di_don">Đi đơn</option>
                                                        <option value="chua_rep">Chưa rep</option>
                                                        <option value="giu_don">Giữ đơn</option>
                                                        <option value="warning">Cảnh báo</option>
                                                        <option value="hoan_thanh">Hoàn thành</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Order Items */}
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-3">Danh sách sản phẩm</h4>
                                                {orderItems.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-200">
                                                                {orderItems.map((item, index) => (
                                                                    <tr key={index}>
                                                                        <td className="px-4 py-3 text-sm text-gray-900">{item.content || item.product_name || 'N/A'}</td>
                                                                        <td className="px-4 py-3 text-sm text-gray-900">{item.quantity || 0}</td>
                                                                        <td className="px-4 py-3 text-sm text-gray-900">{item.unit_price ? item.unit_price.toLocaleString() : (item.price ? item.price.toLocaleString() : 0)} VNĐ</td>
                                                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                                            {(((item.quantity ?? 0) * (item.unit_price ?? item.price ?? 0)) || 0).toLocaleString()} VNĐ
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-gray-500">
                                                        Không có sản phẩm nào trong đơn hàng này
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                                    <button
                                        onClick={closeModal}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


