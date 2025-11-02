"use client";

import { useState, useEffect, useCallback } from 'react';
import { OrderService } from './OrderService';
import {
    OrderCreationResponse,
    PreviewOrder,
    PreviewOrderItem,
    PreviewOrdersResponseSummary
} from './OrderTypes';
import { Plus, Calendar, AlertCircle, CheckCircle, X } from 'lucide-react';

export default function OrderCreation() {
    const [startTime, setStartTime] = useState<string>("");
    const [endTime, setEndTime] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<OrderCreationResponse | null>(null);
    const [error, setError] = useState<string>("");
    const [showResultModal, setShowResultModal] = useState<boolean>(false);
    const [ordersPreview, setOrdersPreview] = useState<PreviewOrder[]>([]);
    const [summaryPreview, setSummaryPreview] = useState<PreviewOrdersResponseSummary | undefined>();
    const [orderCreatedMap, setOrderCreatedMap] = useState<Record<string, boolean | "loading">>({});
    const [fetchingPreview, setFetchingPreview] = useState(false);
    const [creatingAll, setCreatingAll] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PreviewOrder | null>(null);

    // Convert datetime-local to ISO string with UTC timezone
    const toISOString = (localDateTime: string): string => {
        if (!localDateTime) return "";
        // localDateTime is in format: YYYY-MM-DDTHH:mm
        const date = new Date(localDateTime + ":00");
        const timezoneOffset = date.getTimezoneOffset();
        const utcDate = new Date(date.getTime() - timezoneOffset * 60000);
        return utcDate.toISOString();
    };

    // Helper: default date range
    function getDefaultRange() {
        const now = new Date();
        const end = new Date(now); // hiện tại
        const start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(20, 0, 0, 0); // hôm trước 20:00
        function toInputLocal(d: Date) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
        }
        return { start: toInputLocal(start), end: toInputLocal(end) };
    }

    // Cập nhật mặc định range khi mount
    useEffect(() => {
        const { start, end } = getDefaultRange();
        setStartTime(start);
        setEndTime(end);
    }, []);

    // Tách hàm fetchPreview để có thể gọi lại
    const fetchPreview = useCallback(async () => {
        if (!startTime || !endTime) return;
        setFetchingPreview(true);
        setOrdersPreview([]);
        setSummaryPreview(undefined);
        setError('');
        try {
            const resp = await OrderService.previewFromPrintedHistory({
                startTime: toISOString(startTime),
                endTime: toISOString(endTime)
            });
            if (resp.success && resp.data) {
                setOrdersPreview(resp.data.orders || []);
                setSummaryPreview(resp.data.summary);
                // Map, nhưng key là username/NgàyLive (nếu cần unique hơn có thể `${username}-${liveDate}`)
                const mapInit: Record<string, boolean> = {};
                (resp.data.orders || []).forEach(o => { mapInit[`${o.username}||${o.liveDate}`] = false; });
                setOrderCreatedMap(mapInit);
            } else {
                setError(resp.message || 'Không lấy được danh sách đơn có thể tạo.');
                setSummaryPreview(undefined);
                setOrdersPreview([]);
            }
        } catch (e) {
            setError('Không fetch được danh sách đơn tạo được.');
            setOrdersPreview([]);
            setSummaryPreview(undefined);
        } finally {
            setFetchingPreview(false);
        }
    }, [startTime, endTime]);

    // Fetch preview mỗi lần range đổi
    useEffect(() => {
        fetchPreview();
    }, [fetchPreview]);

    // Tạo một đơn hàng cụ thể
    async function handleCreateSingleOrder(order: PreviewOrder) {
        const id = `${order.username}||${order.liveDate}`;
        setOrderCreatedMap(prev => ({ ...prev, [id]: 'loading' }));
        try {
            // Chuyển đổi liveDate từ ISO string sang format YYYY-MM-DD
            const liveDate = order.liveDate ? new Date(order.liveDate).toISOString().split('T')[0] : '';

            // Tạo payload với thông tin đơn cụ thể
            const payload = {
                username: order.username,
                liveDate: liveDate,
                items: order.items.map(item => ({
                    content: item.content || '',
                    unit_price: item.unit_price,
                    quantity: item.quantity
                }))
            };

            const resp = await OrderService.createOrder(payload);
            if (resp.success) {
                setOrderCreatedMap(prev => ({ ...prev, [id]: true }));
                // Refresh preview để cập nhật danh sách đơn (đơn đã tạo sẽ không còn trong preview)
                await fetchPreview();
            } else {
                setOrderCreatedMap(prev => ({ ...prev, [id]: false }));
                setError(resp.message || 'Tạo đơn thất bại!');
            }
        } catch (e) {
            setOrderCreatedMap(prev => ({ ...prev, [id]: false }));
            setError('Tạo đơn thất bại!');
        }
    }

    // Tạo tất cả các đơn chưa tạo
    async function handleCreateAll() {
        setCreatingAll(true);
        for (const order of ordersPreview) {
            const id = `${order.username}||${order.liveDate}`;
            if (!orderCreatedMap[id] || orderCreatedMap[id] === 'loading') {
                await handleCreateSingleOrder(order);
            }
        }
        setCreatingAll(false);
    }

    const closeResultModal = () => {
        setShowResultModal(false);
        setResult(null);
        setError("");
    };

    return (
        <div className="space-y-6">
            {/* Tổng doanh thu ước tính */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 flex items-center gap-4">
                <div className="flex-1 text-lg font-semibold text-blue-800">
                    Ước tính doanh thu: {summaryPreview ? summaryPreview.totalAmount.toLocaleString('vi-VN') + ' đ' : '-'}
                </div>
                <div className="text-xs text-blue-700">
                    {summaryPreview && `${summaryPreview.totalOrders} đơn, ${summaryPreview.totalItems} sản phẩm`}
                </div>
            </div>
            {/* Lọc thời gian */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    Chọn khoảng thời gian
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">Bắt đầu</label>
                        <input
                            type="datetime-local"
                            lang="en-GB"
                            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            placeholder="Chọn thời gian bắt đầu"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">Kết thúc</label>
                        <input
                            type="datetime-local"
                            lang="en-GB"
                            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            placeholder="Chọn thời gian kết thúc"
                        />
                    </div>
                </div>
            </div>
            {/* Nút tạo tất cả */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                    <button
                        onClick={handleCreateAll}
                        disabled={creatingAll || ordersPreview.length === 0 || Object.values(orderCreatedMap).filter(status => !status || status === 'loading').length === 0}
                        className="px-5 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md w-full md:w-auto text-base"
                    >
                        {creatingAll
                            ? 'Đang tạo tất cả...'
                            : `Tạo tất cả đơn (${Object.values(orderCreatedMap).filter(status => !status || status === 'loading').length}/${ordersPreview.length})`}
                    </button>
                    <span className="hidden md:inline text-xs text-gray-500">Tổng: {ordersPreview.length} đơn</span>
                </div>
                {/* PC: Table */}
                <div className="hidden md:block">
                    <h3 className="font-semibold text-lg text-gray-800 mb-4">Danh sách đơn hàng có thể tạo ({ordersPreview.length})</h3>
                    {fetchingPreview && <div className="text-blue-600">Đang tải danh sách đơn...</div>}
                    <table className="min-w-full mt-2 text-sm">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2">Username</th>
                                <th className="px-3 py-2">Ngày live</th>
                                <th className="px-3 py-2">Sản phẩm</th>
                                <th className="px-3 py-2">Tổng</th>
                                <th className="px-3 py-2">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordersPreview.map(order => {
                                const id = `${order.username}||${order.liveDate}`;
                                return (
                                    <tr key={id}>
                                        <td className="px-3 py-2">{order.username}</td>
                                        <td className="px-3 py-2">{order.liveDate ? new Date(order.liveDate).toLocaleDateString('vi-VN') : '-'}</td>
                                        <td className="px-3 py-2 text-center">{order.items.reduce((sum, sp) => sum + (sp.quantity || 0), 0)}</td>
                                        <td className="px-3 py-2 font-semibold">{order.total.toLocaleString('vi-VN')}</td>
                                        <td className="px-3 py-2">
                                            <button
                                                disabled={orderCreatedMap[id] === true || orderCreatedMap[id] === 'loading'}
                                                onClick={() => handleCreateSingleOrder(order)}
                                                className={`px-3 py-1 rounded text-white text-xs  ${orderCreatedMap[id] === true ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} ${orderCreatedMap[id] === 'loading' ? 'animate-pulse' : ''}`}
                                            >
                                                {orderCreatedMap[id] === true ? 'Đã tạo' : orderCreatedMap[id] === 'loading' ? 'Đang tạo...' : 'Tạo đơn'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {/* MOBILE: Card view */}
                <div className="md:hidden">
                    <h3 className="font-semibold text-base text-gray-800 mb-4">Đơn hàng ({ordersPreview.length})</h3>
                    {fetchingPreview && <div className="text-blue-600">Đang tải danh sách đơn...</div>}
                    <div className="space-y-3">
                        {ordersPreview.map(order => {
                            const id = `${order.username}||${order.liveDate}`;
                            return (
                                <div key={id}
                                    className="rounded-xl shadow-md border border-gray-200 bg-gray-50 p-4 flex flex-col gap-2 cursor-pointer"
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                        <span className="text-blue-700">{order.username}</span>
                                        <span className="text-gray-500">- {order.liveDate ? new Date(order.liveDate).toLocaleDateString('vi-VN') : '-'}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800">Sản phẩm: {order.items.reduce((sum, sp) => sum + (sp.quantity || 0), 0)}</span>
                                        <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold">Tổng: {order.total.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <button
                                        disabled={orderCreatedMap[id] === true || orderCreatedMap[id] === 'loading'}
                                        onClick={e => { e.stopPropagation(); handleCreateSingleOrder(order); }}
                                        className={
                                            'w-full mt-2 px-0 py-2 rounded text-white text-base font-bold transition ' +
                                            (orderCreatedMap[id] === true ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700') +
                                            (orderCreatedMap[id] === 'loading' ? ' animate-pulse' : '')
                                        }
                                    >
                                        {orderCreatedMap[id] === true ? 'Đã tạo' : orderCreatedMap[id] === 'loading' ? 'Đang tạo...' : 'Tạo đơn'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-4">Tổng: {ordersPreview.length} đơn</div>
                </div>
            </div>
            {/* Error Display */}
            {error && !showResultModal && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-red-900">Lỗi</h4>
                            <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                        <button
                            onClick={() => setError("")}
                            className="text-red-600 hover:text-red-800"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
            {/* Modal chi tiết đơn hàng trên mobile */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative">
                        <button onClick={() => setSelectedOrder(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"><X className="w-6 h-6" /></button>
                        <h3 className="text-lg font-bold mb-2 text-center">Chi tiết đơn hàng</h3>
                        <div className="mb-1 text-blue-800 font-semibold text-center">{selectedOrder.username}</div>
                        <div className="mb-2 text-center text-sm text-gray-600">Ngày live: {selectedOrder.liveDate ? new Date(selectedOrder.liveDate).toLocaleDateString('vi-VN') : '-'}</div>
                        <div className="flex justify-center gap-2 mb-2">
                            <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-sm">Tổng sản phẩm: {selectedOrder.items.reduce((sum, sp) => sum + (sp.quantity || 0), 0)}</span>
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-900 font-semibold text-sm">Tổng: {selectedOrder.total.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="mb-3">
                            <h4 className="font-semibold text-sm mb-1 text-gray-700">Danh sách sản phẩm</h4>
                            {selectedOrder.items.length === 0 ? (
                                <div className="text-gray-500 text-xs">Không có sản phẩm!</div>
                            ) : (
                                <div className="overflow-x-auto w-full">
                                    <table className="min-w-full text-sm border-collapse bg-white rounded-lg">
                                        <thead>
                                            <tr className="bg-gray-100 text-gray-700">
                                                <th className="px-3 py-2 text-left font-semibold">Tên/SP</th>
                                                <th className="px-3 py-2 text-right font-semibold">SL</th>
                                                <th className="px-3 py-2 text-right font-semibold">Đơn giá</th>
                                                <th className="px-3 py-2 text-right font-semibold">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedOrder.items.map((item, idx) => (
                                                <tr key={idx} className="border-b last:border-b-0 group hover:bg-gray-50 transition">
                                                    <td className="px-3 py-2 text-gray-900 text-left align-top whitespace-pre-line">{item.content || "SP"}</td>
                                                    <td className="px-3 py-2 text-right align-top">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-right text-gray-700 align-top">{item.unit_price.toLocaleString('vi-VN')}</td>
                                                    <td className="px-3 py-2 text-right align-top font-bold text-blue-800">{item.line_total.toLocaleString('vi-VN')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <button
                            disabled={orderCreatedMap[`${selectedOrder.username}||${selectedOrder.liveDate}`] === true || orderCreatedMap[`${selectedOrder.username}||${selectedOrder.liveDate}`] === 'loading'}
                            onClick={() => handleCreateSingleOrder(selectedOrder)}
                            className={`mt-3 w-full px-0 py-2 rounded text-white text-base font-bold transition ${orderCreatedMap[`${selectedOrder.username}||${selectedOrder.liveDate}`] === true ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} ${orderCreatedMap[`${selectedOrder.username}||${selectedOrder.liveDate}`] === 'loading' ? ' animate-pulse' : ''}`}
                        >
                            {orderCreatedMap[`${selectedOrder.username}||${selectedOrder.liveDate}`] === true ? 'Đã tạo' : orderCreatedMap[`${selectedOrder.username}||${selectedOrder.liveDate}`] === 'loading' ? 'Đang tạo...' : 'Tạo đơn'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

