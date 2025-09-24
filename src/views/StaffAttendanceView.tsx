'use client';

import { useEffect, useState } from 'react';
import { Calendar, RefreshCw, MapPin, Clock, BarChart } from 'lucide-react';
import AttendanceService from '@/components/AttendanceService';
import { AttendanceRecord, AttendanceSummary } from '@/components/AttendanceTypes';
import Popup from '@/components/Popup';

export default function StaffAttendanceView() {
    const [userId, setUserId] = useState<string>('');
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [success, setSuccess] = useState<string>('');
    const [summary, setSummary] = useState<AttendanceSummary | null>(null);
    const [locationLoading, setLocationLoading] = useState<boolean>(false);

    // Format work duration function
    const formatWorkDuration = (minutes: number) => {
        if (!minutes || minutes < 0) return '--:--';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const loadProfile = async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) return;
            const res = await fetch('https://worktime-dux3.onrender.com/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
            if (res.ok) {
                const data = await res.json();
                setUserId(data?.user?.id || '');
            }
        } catch {
            // ignore
        }
    };

    const loadHistory = async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const list = await AttendanceService.getAttendanceHistory(userId, month, year);
            setRecords(list);
            const s = await AttendanceService.getAttendanceSummary(userId, month, year);
            setSummary(s as any);
        } catch (e: any) {
            setError(e?.message || 'Không tải được dữ liệu chấm công');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        try {
            setLocationLoading(true);
            const pos = await AttendanceService.getCurrentPosition();
            await AttendanceService.checkIn(userId, pos.coords.longitude, pos.coords.latitude);
            setSuccess('Check In thành công');
            await loadHistory();
        } catch (e: any) {
            setError(e?.message || 'Check In thất bại');
        } finally {
            setLocationLoading(false);
        }
    };

    const handleCheckOut = async () => {
        try {
            setLocationLoading(true);
            const pos = await AttendanceService.getCurrentPosition();
            await AttendanceService.checkOut(userId, pos.coords.longitude, pos.coords.latitude);
            setSuccess('Check Out thành công');
            await loadHistory();
        } catch (e: any) {
            setError(e?.message || 'Check Out thất bại');
        } finally {
            setLocationLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => {
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, month, year]);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                {/* Actions like original UI */}
                <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={handleCheckIn}
                            disabled={locationLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {locationLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span className="font-medium">Đang lấy vị trí...</span>
                                </>
                            ) : (
                                <>
                                    <MapPin className="h-5 w-5" />
                                    <span className="font-medium">Check In</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleCheckOut}
                            disabled={locationLoading}
                            className="bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {locationLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span className="font-medium">Đang lấy vị trí...</span>
                                </>
                            ) : (
                                <>
                                    <MapPin className="h-5 w-5" />
                                    <span className="font-medium">Check Out</span>
                                </>
                            )}
                        </button>
                    </div>

                    <Popup message={error} type="error" onClose={() => setError('')} />
                    <Popup message={success} type="success" onClose={() => setSuccess('')} />
                </div>

                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-3">
                        <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                        Lịch sử chấm công của bạn
                    </h2>

                    {/* Mobile-first responsive layout */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1 min-w-0">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tháng</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors duration-200"
                                    value={month}
                                    onChange={e => setMonth(Number(e.target.value))}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>Tháng {m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-0">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Năm</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors duration-200"
                                    value={year}
                                    onChange={e => setYear(Number(e.target.value))}
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 flex-shrink-0"
                            title="Làm mới"
                            onClick={loadHistory}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng giờ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            <span>Đang tải...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : records.length > 0 ? (
                                records.map((record) => (
                                    <tr key={record._id || record.id} className={!record.isValid ? "bg-red-50" : ""}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.checkInTime ? new Date(record.checkInTime).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}
                                            {!record.isValid && <span className="ml-2 text-xs text-red-500">(Không hợp lệ)</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.workTimeFormatted || (record.workDuration !== undefined ? formatWorkDuration(record.workDuration) : '--:--')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                        Chưa có dữ liệu chấm công
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-gray-500">Đang tải...</span>
                            </div>
                        </div>
                    ) : records.length > 0 ? (
                        <div className="space-y-4">
                            {records.map((record) => (
                                <div
                                    key={record._id || record.id}
                                    className={`border rounded-lg shadow-sm p-4 ${!record.isValid ? "bg-red-50 border-red-100" : "bg-white border-gray-200"}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-sm font-medium text-gray-900">
                                            📅 {record.checkInTime ? new Date(record.checkInTime).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'N/A'}
                                        </div>
                                        {!record.isValid && (
                                            <span className="text-xs text-red-500 px-2 py-1 bg-red-100 rounded-full">
                                                Không hợp lệ
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Check In:</span>
                                            <span className="text-gray-900">
                                                {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Check Out:</span>
                                            <span className="text-gray-900">
                                                {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                                            <span className="text-gray-500">Tổng giờ:</span>
                                            <span className="font-medium text-blue-600">
                                                {record.workTimeFormatted || (record.workDuration !== undefined ? formatWorkDuration(record.workDuration) : '--:--')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-sm text-gray-500">
                            Chưa có dữ liệu chấm công
                        </div>
                    )}
                </div>
                {/* Summary like original UI */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-md font-medium text-gray-900 flex items-center">
                            <BarChart className="h-4 w-4 mr-2 text-blue-600" />
                            Tổng kết chấm công tháng {month}/{year}
                        </h3>
                    </div>
                    {!summary ? (
                        <div className="text-center py-4">
                            <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-gray-500">Đang tải thống kê...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mobile summary */}
                            <div className="md:hidden overflow-hidden bg-white shadow-sm rounded-lg">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                                    <p className="text-sm font-medium text-gray-700">Tổng kết chấm công {month}/{year}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 p-4">
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <p className="text-[11px] text-gray-500 mb-1">Tổng số ngày làm việc</p>
                                        <p className="text-lg font-bold text-blue-700">{summary.totalDaysWorked || 0} <span className="text-xs font-normal">ngày</span></p>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg">
                                        <p className="text-[11px] text-gray-500 mb-1">Tổng thời gian làm việc</p>
                                        <p className="text-lg font-bold text-green-700">{summary.totalWorkDuration?.formatted || '0h 0m'}</p>
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-lg col-span-2">
                                        <p className="text-[11px] text-gray-500 mb-1">Giờ làm trung bình</p>
                                        <p className="text-lg font-bold text-purple-700">{summary.averageWorkDurationPerDay?.formatted || '0h 0m'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop summary */}
                            <div className="hidden md:block overflow-hidden bg-white shadow-sm rounded-lg">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-b border-gray-200">
                                    <p className="text-sm font-medium text-gray-700">Tổng kết chấm công tháng {month}/{year}</p>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Tổng số ngày làm việc</p>
                                        <p className="text-xl font-bold text-blue-700">{summary.totalDaysWorked || 0} <span className="text-sm font-normal">ngày</span></p>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Tổng thời gian làm việc</p>
                                        <p className="text-xl font-bold text-green-700">{summary.totalWorkDuration?.formatted || '0h 0m'}</p>
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Giờ làm trung bình</p>
                                        <p className="text-xl font-bold text-purple-700">{summary.averageWorkDurationPerDay?.formatted || '0h 0m'}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}


