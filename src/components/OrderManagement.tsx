"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ORDER_STATUS_LABELS, ORDER_STATUS_SORT_WEIGHT, Order, OrderStatus, StatusCountEntry } from './OrderTypes';
import { OrderService } from './OrderService';

const DEFAULT_LIMIT = 100000;

export default function OrderManagement() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [statusCounts, setStatusCounts] = useState<StatusCountEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    // pagination removed on UI
    const limit = DEFAULT_LIMIT;
    const [search, setSearch] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    // giữ giá trị theo định dạng input datetime-local: YYYY-MM-DDTHH:mm
    const [startInput, setStartInput] = useState<string>("");
    const [endInput, setEndInput] = useState<string>("");
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
            interface ListOrdersResponse { data?: Order[]; statusCounts?: StatusCountEntry[] }
            const resp = data as ListOrdersResponse;
            const list = Array.isArray(resp?.data) ? resp.data : [];
            const counts = Array.isArray(resp?.statusCounts) ? resp.statusCounts : [];
            setOrders(list);
            setStatusCounts(counts);
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
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Quản lí đơn hàng</h2>
                <p className="text-sm text-gray-600">Lọc theo thời gian, tìm kiếm, đổi trạng thái theo yêu cầu</p>
            </div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-lg text-gray-800 mb-4">Bộ lọc</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">Bắt đầu</label>
                        <input
                            type="datetime-local"
                            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={startInput}
                            onChange={e => setStartInput(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">Kết thúc</label>
                        <input
                            type="datetime-local"
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
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                        <select
                            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); }}
                        >
                            <option value="">Tất cả</option>
                            <option value="gap">Gấp</option>
                            <option value="di_don">Đi đơn</option>
                            <option value="chua_rep">Chưa rep</option>
                            <option value="giu_don">Giữ đơn</option>
                            <option value="hoan_thanh">Hoàn thành</option>
                        </select>
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

            {/* Status summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-lg text-gray-800 mb-4">Thống kê trạng thái</h3>
                <div className="flex flex-wrap gap-3">
                    {(['gap', 'di_don', 'chua_rep', 'giu_don', 'hoan_thanh'] as OrderStatus[]).map(st => {
                        const count = statusCounts.find(s => s.status === st)?.count ?? 0;
                        return (
                            <div
                                key={st}
                                className={
                                    `px-4 py-2 rounded-lg border-2 font-medium ` +
                                    (st === 'gap' ? 'bg-red-50 border-red-200 text-red-700' : '') +
                                    (st === 'di_don' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : '') +
                                    (st === 'chua_rep' ? 'bg-blue-50 border-blue-200 text-blue-700' : '') +
                                    (st === 'giu_don' ? 'bg-purple-50 border-purple-200 text-purple-700' : '') +
                                    (st === 'hoan_thanh' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : '')
                                }
                            >
                                {ORDER_STATUS_LABELS[st]}: <span className="font-bold text-lg">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && (
                                <tr><td className="px-6 py-4 text-center text-gray-500" colSpan={7}>Đang tải...</td></tr>
                            )}
                            {!loading && sortedOrders.length === 0 && (
                                <tr><td className="px-6 py-4 text-center text-gray-500" colSpan={7}>Không có dữ liệu</td></tr>
                            )}
                            {!loading && sortedOrders.map(o => (
                                <tr key={o.id} className={
                                    `hover:bg-gray-50 ` +
                                    (o.status === 'gap' ? 'bg-red-50 border-l-4 border-l-red-400' : '') +
                                    (o.status === 'di_don' ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : '') +
                                    (o.status === 'chua_rep' ? 'bg-blue-50 border-l-4 border-l-blue-400' : '') +
                                    (o.status === 'giu_don' ? 'bg-purple-50 border-l-4 border-l-purple-400' : '') +
                                    (o.status === 'hoan_thanh' ? 'bg-emerald-50 border-l-4 border-l-emerald-400' : '')
                                }>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{o.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{o.customer_username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{o.total_amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.live_date ? new Date(o.live_date).toLocaleDateString('vi-VN') : '-'}</td>
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
                                                <p className="font-medium">{selectedOrder.live_date ? new Date(selectedOrder.live_date).toLocaleDateString('vi-VN') : '-'}</p>
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
                                                                    {item.quantity && (item.unit_price || item.price) ? (item.quantity * (item.unit_price || item.price)).toLocaleString() : 0} VNĐ
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
        </div>
    );
}


