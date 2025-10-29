'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, User, X, Pencil } from 'lucide-react';
import Popup from '@/components/Popup';
import { Customer } from '@/components/CustomerTypes';
import { CustomerService } from '@/components/CustomerService';

export default function CustomersView() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(20);
    const [search, setSearch] = useState<string>('');

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    // Modal state
    const [showModal, setShowModal] = useState<boolean>(false);
    const [editing, setEditing] = useState<boolean>(false);
    const [current, setCurrent] = useState<Customer | null>(null);
    const [form, setForm] = useState<{ username: string; name: string; phone: string; address: string; notes: string; }>({ username: '', name: '', phone: '', address: '', notes: '' });

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

    const load = async () => {
        try {
            setLoading(true);
            const res = await CustomerService.list({ page, limit, search });
            setCustomers(res.data || []);
            setTotal(res.total || 0);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Lỗi tải khách hàng';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit]);

    const onSearch = async () => {
        setPage(1);
        await load();
    };

    const openCreate = () => {
        setEditing(false);
        setCurrent(null);
        setForm({ username: '', name: '', phone: '', address: '', notes: '' });
        setShowModal(true);
    };

    const openEdit = (c: Customer) => {
        setEditing(true);
        setCurrent(c);
        setForm({ username: c.username || '', name: c.name || '', phone: c.phone || '', address: c.address || '', notes: c.notes || '' });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    const save = async () => {
        try {
            setLoading(true);
            if (editing && current) {
                await CustomerService.update(current.id, { username: form.username, name: form.name, phone: form.phone, address: form.address, notes: form.notes });
            } else {
                await CustomerService.upsert({ username: form.username, name: form.name, phone: form.phone, address: form.address, notes: form.notes });
            }
            setShowModal(false);
            await load();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Lỗi lưu khách hàng';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const toggleMark = async (c: Customer) => {
        try {
            await CustomerService.mark(c.id, !c.marked_at);
            await load();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Lỗi cập nhật đánh dấu';
            setError(msg);
        }
    };

    const remove = async (c: Customer) => {
        if (!confirm('Xóa khách hàng này?')) return;
        try {
            await CustomerService.remove(c.id);
            await load();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Lỗi xóa khách hàng';
            setError(msg);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <Popup message={error} type="error" onClose={() => setError('')} />

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm khách hàng</label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo username, tên, điện thoại, địa chỉ"
                                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
                                />
                            </div>
                            <button onClick={onSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">Tìm</button>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                            <select className="ml-auto border border-gray-300 rounded-lg text-sm px-2 py-1" value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
                                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/trang</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex md:justify-end items-end">
                        <button onClick={openCreate} className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm">
                            <Plus className="h-4 w-4" /> Thêm/Update theo Username
                        </button>
                    </div>
                </div>
            </div>

            {/* List/Table */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center"><User className="h-5 w-5 mr-2 text-blue-600" />Danh sách khách hàng</h2>
                    <div className="text-sm text-gray-600">Tổng: <span className="font-semibold">{total}</span></div>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Điện thoại</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Địa chỉ</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {customers.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-sm text-gray-900">{c.id}</td>
                                    <td className="px-6 py-3 text-sm text-gray-900">{c.username}</td>
                                    <td className="px-6 py-3 text-sm text-gray-900">{c.name}</td>
                                    <td className="px-6 py-3 text-sm text-gray-900">{c.phone || '-'}</td>
                                    <td className="px-6 py-3 text-sm text-gray-900">{c.address || '-'}</td>
                                    <td className="px-6 py-3 text-sm text-gray-900 max-w-xs truncate" title={c.notes || ''}>{c.notes || '-'}</td>
                                    <td className="px-6 py-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEdit(c)} className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded inline-flex items-center gap-1"><Pencil className="h-4 w-4" />Sửa</button>
                                            <button onClick={() => remove(c)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded inline-flex items-center gap-1"><Trash2 className="h-4 w-4" />Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {customers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">{loading ? 'Đang tải...' : 'Không có dữ liệu'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile list */}
                <div className="md:hidden divide-y divide-gray-200">
                    {customers.length === 0 && (
                        <div className="p-6 text-center text-gray-500">{loading ? 'Đang tải...' : 'Không có dữ liệu'}</div>
                    )}
                    {customers.map(c => (
                        <div key={c.id} className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-1">{c.username}</p>
                                    <p className="text-sm text-gray-700">{c.phone || '-'}</p>
                                    <p className="text-sm text-gray-700">{c.address || '-'}</p>
                                    {c.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.notes}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-2 ml-3">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => openEdit(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="h-5 w-5" /></button>
                                        <button onClick={() => remove(c)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-5 w-5" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">Trang {page}/{totalPages}</div>
                    <div className="flex items-center gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Trước</button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Sau</button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">{editing ? 'Cập nhật khách hàng' : 'Thêm/Cập nhật theo Username'}</h3>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded"><X className="h-5 w-5 text-gray-500" /></button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username<span className="text-red-500">*</span></label>
                                <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="username" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tên khách" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="SĐT" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Địa chỉ" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Ghi chú" />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button onClick={closeModal} className="px-4 py-2 rounded-lg border">Hủy</button>
                                <button onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Lưu</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


