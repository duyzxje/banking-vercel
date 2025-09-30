'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCw, Search, X } from 'lucide-react';
import Popup from '@/components/Popup';

interface Transaction {
    _id: string;
    taiKhoanNhan: string;
    taiKhoanChuyen: string;
    tenNguoiChuyen?: string;
    tTenNguoiChuyen?: string;
    tTen?: string;
    tTenNguoiNhan?: string;
    nganHangChuyen: string;
    loaiGiaoDich: string;
    maGiaoDich: string;
    ngayGioGiaoDich: string;
    soTien: string;
    soTienNumber: number;
    noiDungGiaoDich: string;
}

export default function TransactionsView() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [search, setSearch] = useState<string>("");
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    // Format currency function
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(Math.abs(amount));
    };

    // Format as DD/MM/YYYY HH:MM:SS
    const formatDateTime = (dateTime?: string) => {
        if (!dateTime) return 'N/A';

        try {
            const dateObj = new Date(dateTime);
            if (isNaN(dateObj.getTime())) return 'N/A';

            const day = dateObj.getDate().toString().padStart(2, '0');
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const year = dateObj.getFullYear();
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            const seconds = dateObj.getSeconds().toString().padStart(2, '0');

            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        } catch {
            return 'N/A';
        }
    };

    const openTransactionDetail = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
    };

    const closeTransactionDetail = () => {
        setSelectedTransaction(null);
    };

    // Load all transactions once
    const loadTransactions = async () => {
        try {
            setLoading(true);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : undefined;
            const res = await fetch('/api/transactions?limit=500', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
                cache: 'no-store'
            });
            if (!res.ok) throw new Error('Failed to fetch transactions');
            const data = await res.json() as { transactions?: Transaction[]; data?: Transaction[] | { transactions?: Transaction[] } };
            // tolerant mapping for various shapes
            const maybe = data;
            const list: Transaction[] =
                (Array.isArray(maybe?.transactions) && maybe.transactions) ||
                (Array.isArray(maybe?.data) && maybe.data) ||
                (Array.isArray(maybe?.data?.transactions) && maybe.data.transactions) ||
                [];
            // debug: console.log length
            // optional debug in dev only
            setTransactions(list);
            setLastUpdateTime(new Date());
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Lỗi tải giao dịch';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Poll the latest few transactions and merge in without full reload
    const pollLatest = async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : undefined;
            const res = await fetch('/api/transactions?limit=5', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
                cache: 'no-store'
            });
            if (!res.ok) return;
            const data = await res.json() as { transactions?: Transaction[]; data?: Transaction[] | { transactions?: Transaction[] } };
            const maybe = data;
            const latest: Transaction[] =
                (Array.isArray(maybe?.transactions) && maybe.transactions) ||
                (Array.isArray(maybe?.data) && maybe.data) ||
                (Array.isArray(maybe?.data?.transactions) && maybe.data.transactions) || [];
            if (latest.length === 0) return;
            setTransactions(prev => {
                const seen = new Set(prev.map(t => t._id));
                const newOnes = latest.filter(t => !seen.has(t._id));
                if (newOnes.length === 0) return prev;
                // Prepend new items, keep existing order for others
                return [...newOnes, ...prev];
            });
            setLastUpdateTime(new Date());
        } catch {
            // silent polling failure
        }
    };

    useEffect(() => {
        loadTransactions();
        const id = setInterval(pollLatest, 15000);
        return () => clearInterval(id);
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return transactions;
        const q = search.trim().toLowerCase();
        return transactions.filter(t => (
            (t.tenNguoiChuyen || t.tTenNguoiChuyen || '').toLowerCase().includes(q) ||
            (t.noiDungGiaoDich || '').toLowerCase().includes(q) ||
            (t.maGiaoDich || '').toLowerCase().includes(q) ||
            String(t.soTienNumber || 0).includes(q)
        ));
    }, [transactions, search]);

    return (
        <div>
            <div className="space-y-4 sm:space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="max-w-md mx-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">Tìm kiếm giao dịch</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên, nội dung, mã giao dịch, số tiền..."
                                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <Popup message={error} type="error" onClose={() => setError('')} />

                <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                    <div className="p-4 sm:p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-600" />
                                Danh sách giao dịch
                            </h2>
                            <div className="flex items-center space-x-3">
                                <div className="text-right">
                                    <span className="text-sm font-medium text-gray-700">{filtered.length} giao dịch</span>
                                    {lastUpdateTime && (
                                        <p className="text-xs text-gray-500">Cập nhật: {lastUpdateTime.toLocaleTimeString('vi-VN')}</p>
                                    )}
                                </div>
                                <button onClick={loadTransactions} disabled={loading} className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200 disabled:opacity-50 hover:bg-blue-50 rounded-lg" title="Làm mới">
                                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                        {filtered.length > 0 ? filtered.map(t => (
                            <div key={t._id} className="p-4 sm:p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 border-l-4 border-transparent hover:border-blue-400" onClick={() => openTransactionDetail(t)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <p className="text-sm font-semibold text-gray-900 break-words w-full sm:w-auto">{t.tenNguoiChuyen || ''}</p>
                                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{t.taiKhoanChuyen}</span>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t.nganHangChuyen}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap break-words">{t.noiDungGiaoDich || 'Không có mô tả'}</p>
                                        <p className="text-xs text-gray-400 mt-1">Mã GD: {t.maGiaoDich}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={`text-lg sm:text-xl font-bold ${t.soTienNumber > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.soTienNumber > 0 ? '+' : ''}{formatCurrency(t.soTienNumber)}
                                        </p>
                                        <div className="flex flex-col items-end text-xs text-gray-500 mt-1">
                                            <span className="mb-1">{formatDateTime(t.ngayGioGiaoDich)}</span>
                                            <span className="text-blue-600 font-medium">{t.loaiGiaoDich}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                    <CreditCard className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500 text-lg mb-2">{search ? 'Không tìm thấy giao dịch nào phù hợp' : 'Chưa có giao dịch nào'}</p>
                                {search && <p className="text-gray-400 text-sm">Thử tìm kiếm với từ khóa khác</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10">
                        <div className="p-4 sm:p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                                    Chi tiết giao dịch
                                </h3>
                                <button
                                    onClick={closeTransactionDetail}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Transaction Info */}
                            <div className="space-y-4">
                                {/* Amount */}
                                <div className="text-center py-4 border-b border-gray-200">
                                    <p className={`text-2xl sm:text-3xl font-bold ${selectedTransaction.soTienNumber > 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                        }`}>
                                        {selectedTransaction.soTienNumber > 0 ? '+' : ''}
                                        {formatCurrency(selectedTransaction.soTienNumber)}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        VND
                                    </p>
                                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${selectedTransaction.soTienNumber > 0
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {selectedTransaction.soTienNumber > 0 ? 'Tiền vào' : 'Tiền ra'}
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mã giao dịch
                                        </label>
                                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                            {selectedTransaction.maGiaoDich}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Thời gian
                                        </label>
                                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                            {formatDateTime(selectedTransaction.ngayGioGiaoDich)}
                                        </p>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Loại giao dịch
                                        </label>
                                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                            {selectedTransaction.loaiGiaoDich}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tên người chuyển
                                        </label>
                                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                            {selectedTransaction.tenNguoiChuyen || 'N/A'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tài khoản chuyển
                                        </label>
                                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                            {selectedTransaction.taiKhoanChuyen}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Ngân hàng chuyển
                                        </label>
                                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                            {selectedTransaction.nganHangChuyen}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tài khoản nhận
                                        </label>
                                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                            {selectedTransaction.taiKhoanNhan}
                                        </p>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nội dung chuyển khoản
                                    </label>
                                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                                        {selectedTransaction.noiDungGiaoDich || 'Không có mô tả'}
                                    </p>
                                </div>
                            </div>

                            {/* Close Button */}
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={closeTransactionDetail}
                                    className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


