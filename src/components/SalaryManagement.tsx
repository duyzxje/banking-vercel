'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Download, Edit, Eye, ChevronLeft, ChevronRight, Users, Clock, TrendingUp, X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SalaryRecord {
    userId: string | { _id: string; name: string; username: string; email: string };
    name: string;
    email: string;
    hourlyRate: number;
    totalHours: number;
    totalSalary: number;
    dailyRecords: DailySalaryRecord[];
    month: number;
    year: number;
    calculatedAt: string;
}

interface DailySalaryRecord {
    date: string;
    checkInTime: string;
    checkOutTime: string;
    workHours: number;
    dailySalary: number;
    status: string;
}

interface SalaryHistoryRecord {
    _id: string;
    userId: {
        _id: string;
        name: string;
        username: string;
        email: string;
    };
    hourlyRate: number;
    month: number;
    year: number;
    totalHours: number;
    totalSalary: number;
    dailyRecords: DailySalaryRecord[];
    createdAt: string;
    updatedAt: string;
}

interface SalaryManagementProps {
    isAdmin: boolean;
}

interface BonusItem {
    _id: string;
    amount: number;
    reason: string;
    createdAt: string;
}

interface DeductionItem {
    _id: string;
    amount: number;
    reason: string;
    createdAt: string;
}

interface DetailedSalary {
    salaryId: string;
    userId: string | { _id: string; name: string; username: string; email: string };
    name?: string;
    email?: string;
    hourlyRate?: number;
    month: number;
    year: number;
    totalHours?: number;
    totalSalary?: number;
    dailyRecords: DailySalaryRecord[];
    bonuses: BonusItem[];
    deductions: DeductionItem[];
    totalBonus: number;
    totalDeduction: number;
    finalSalary: number;
}

const SalaryManagement: React.FC<SalaryManagementProps> = ({ isAdmin }) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingRate, setEditingRate] = useState<{ userId: string; rate: number } | null>(null);
    const [summary, setSummary] = useState<{
        totalEmployees: number;
        totalHours: number;
        totalSalary: number;
        averageSalary: number;
    } | null>(null);
    const [selectedUser, setSelectedUser] = useState<{ userId: string; name: string } | null>(null);
    const [showCalculateModal, setShowCalculateModal] = useState(false);
    const [calculateLoading, setCalculateLoading] = useState(false);
    const [calculateResult, setCalculateResult] = useState<SalaryRecord | null>(null);
    const [showDetailedModal, setShowDetailedModal] = useState(false);
    const [detailedLoading, setDetailedLoading] = useState(false);
    const [detailedSalary, setDetailedSalary] = useState<DetailedSalary | null>(null);
    const [editDailyMap, setEditDailyMap] = useState<Record<string, number>>({});
    const [editHourlyRateMap, setEditHourlyRateMap] = useState<Record<string, number>>({});
    const [newBonus, setNewBonus] = useState<{ amount: number; reason: string }>({ amount: 0, reason: '' });
    const [newDeduction, setNewDeduction] = useState<{ amount: number; reason: string }>({ amount: 0, reason: '' });

    const loadSalaryData = useCallback(async () => {
        if (!isAdmin) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            const month = selectedMonth.getMonth() + 1;
            const year = selectedMonth.getFullYear();

            const response = await fetch(
                `https://worktime-dux3.onrender.com/api/salary/monthly?month=${month}&year=${year}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSalaryRecords(data.data.salaries || []);
                    setSummary(data.data.summary || null);
                }
            }
        } catch (error) {
            console.error('Error loading salary data:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, isAdmin]);

    useEffect(() => {
        loadSalaryData();
    }, [loadSalaryData]);


    const handleCalculateSalary = async (userId: string, month: number, year: number) => {
        try {
            setCalculateLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setCalculateLoading(false);
                return;
            }

            const response = await fetch('https://worktime-dux3.onrender.com/api/salary/calculate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, month, year })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setCalculateResult(data.data);
                    setShowCalculateModal(true);
                }
            }
        } catch (error) {
            console.error('Error calculating salary:', error);
            alert('Có lỗi xảy ra khi tính lương!');
        } finally {
            setCalculateLoading(false);
        }
    };

    const loadSalaryDetailed = async (userId: string, month: number, year: number) => {
        try {
            setDetailedLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setDetailedLoading(false);
                return;
            }

            const url = `https://worktime-dux3.onrender.com/api/salary/detailed/${userId}/${month}/${year}`;
            console.log('🔍 Loading detailed salary:', { userId, month, year, url });

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Raw API Response:', data);

                if (data) {
                    const salaryData = data.data || data;
                    console.log('💰 Salary Data:', salaryData);

                    // Lấy dữ liệu từ salary object
                    const salary = salaryData.salary || salaryData;
                    console.log('💼 Salary Object:', salary);

                    // Đảm bảo các mảng luôn tồn tại
                    const processedData = {
                        salaryId: salary.id || salary._id || '',
                        userId: salary.userId || '',
                        name: salary.userName || '',
                        email: salary.userEmail || '',
                        hourlyRate: salary.hourlyRate || 0,
                        month: salary.month || 0,
                        year: salary.year || 0,
                        totalHours: salary.totalHours || 0,
                        totalSalary: salary.totalSalary || 0,
                        dailyRecords: salary.dailyRecords || [],
                        bonuses: salary.bonuses || [],
                        deductions: salary.deductions || [],
                        totalBonus: salary.totalBonus || 0,
                        totalDeduction: salary.totalDeduction || 0,
                        finalSalary: salary.finalSalary || salary.totalSalary || 0
                    };
                    console.log('✅ Processed Data:', processedData);
                    setDetailedSalary(processedData);
                    setEditDailyMap({});
                    setEditHourlyRateMap({});
                }
            } else {
                console.error('❌ API Error:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error Response:', errorText);
            }
        } catch (error) {
            console.error('Error loading detailed salary:', error);
        } finally {
            setDetailedLoading(false);
        }
    };

    const handleViewDetailed = (userId: string, name: string) => {
        setSelectedUser({ userId, name });
        setShowDetailedModal(true);
        const month = selectedMonth.getMonth() + 1;
        const year = selectedMonth.getFullYear();
        loadSalaryDetailed(userId, month, year);
    };

    const handleSaveDailySalary = async (date: string, value: number) => {
        if (!detailedSalary?.salaryId) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Vui lòng đăng nhập lại');
                return;
            }

            // Tìm daily record để lấy hourlyRate hiện tại
            const dailyRecord = detailedSalary.dailyRecords.find(r => r.date === date);
            if (!dailyRecord) {
                alert('Không tìm thấy thông tin ngày công');
                return;
            }

            const response = await fetch(`https://worktime-dux3.onrender.com/api/salary/daily/${detailedSalary.salaryId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date,
                    dailySalary: value,
                    hourlyRate: detailedSalary.hourlyRate || 0 // Gửi kèm hourlyRate hiện tại
                })
            });
            if (response.ok) {
                await loadSalaryDetailed(
                    typeof detailedSalary.userId === 'string' ? detailedSalary.userId : detailedSalary.userId._id,
                    detailedSalary.month,
                    detailedSalary.year
                );
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.message || 'Không thể lưu lương ngày');
            }
        } catch (e) {
            console.error('Error saving daily salary:', e);
        }
    };

    const handleSaveHourlyRate = async (date: string, hourlyRate: number) => {
        if (!detailedSalary?.salaryId) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Vui lòng đăng nhập lại');
                return;
            }

            // Tìm daily record để lấy dailySalary hiện tại
            const dailyRecord = detailedSalary.dailyRecords.find(r => r.date === date);
            if (!dailyRecord) {
                alert('Không tìm thấy thông tin ngày công');
                return;
            }

            const response = await fetch(`https://worktime-dux3.onrender.com/api/salary/daily/${detailedSalary.salaryId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date,
                    hourlyRate,
                    dailySalary: dailyRecord.dailySalary // Gửi kèm dailySalary hiện tại
                })
            });
            if (response.ok) {
                await loadSalaryDetailed(
                    typeof detailedSalary.userId === 'string' ? detailedSalary.userId : detailedSalary.userId._id,
                    detailedSalary.month,
                    detailedSalary.year
                );
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.message || 'Không thể lưu mức lương/giờ');
            }
        } catch (e) {
            console.error('Error saving hourly rate:', e);
        }
    };

    const handleAddBonus = async () => {
        if (!detailedSalary?.salaryId || newBonus.amount <= 0 || !newBonus.reason.trim()) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Vui lòng đăng nhập lại');
                return;
            }
            const response = await fetch(`https://worktime-dux3.onrender.com/api/salary/bonus/${detailedSalary.salaryId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newBonus)
            });
            if (response.ok) {
                setNewBonus({ amount: 0, reason: '' });
                await loadSalaryDetailed(
                    typeof detailedSalary.userId === 'string' ? detailedSalary.userId : detailedSalary.userId._id,
                    detailedSalary.month,
                    detailedSalary.year
                );
            }
        } catch (e) {
            console.error('Error adding bonus:', e);
        }
    };

    const handleDeleteBonus = async (bonusId: string) => {
        if (!detailedSalary?.salaryId) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Vui lòng đăng nhập lại');
                return;
            }
            const response = await fetch(`https://worktime-dux3.onrender.com/api/salary/bonus/${detailedSalary.salaryId}/${bonusId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                await loadSalaryDetailed(
                    typeof detailedSalary.userId === 'string' ? detailedSalary.userId : detailedSalary.userId._id,
                    detailedSalary.month,
                    detailedSalary.year
                );
            }
        } catch (e) {
            console.error('Error deleting bonus:', e);
        }
    };

    const handleAddDeduction = async () => {
        if (!detailedSalary?.salaryId || newDeduction.amount <= 0 || !newDeduction.reason.trim()) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Vui lòng đăng nhập lại');
                return;
            }
            const response = await fetch(`https://worktime-dux3.onrender.com/api/salary/deduction/${detailedSalary.salaryId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newDeduction)
            });
            if (response.ok) {
                setNewDeduction({ amount: 0, reason: '' });
                await loadSalaryDetailed(
                    typeof detailedSalary.userId === 'string' ? detailedSalary.userId : detailedSalary.userId._id,
                    detailedSalary.month,
                    detailedSalary.year
                );
            }
        } catch (e) {
            console.error('Error adding deduction:', e);
        }
    };

    const handleDeleteDeduction = async (deductionId: string) => {
        if (!detailedSalary?.salaryId) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Vui lòng đăng nhập lại');
                return;
            }
            const response = await fetch(`https://worktime-dux3.onrender.com/api/salary/deduction/${detailedSalary.salaryId}/${deductionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                await loadSalaryDetailed(
                    typeof detailedSalary.userId === 'string' ? detailedSalary.userId : detailedSalary.userId._id,
                    detailedSalary.month,
                    detailedSalary.year
                );
            }
        } catch (e) {
            console.error('Error deleting deduction:', e);
        }
    };

    const changeMonth = (direction: 'prev' | 'next') => {
        setSelectedMonth(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };

    const handleUpdateRate = async (userId: string, newRate: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Vui lòng đăng nhập lại');
                return;
            }

            const month = selectedMonth.getMonth() + 1; // Convert to 1-12
            const year = selectedMonth.getFullYear();

            const response = await fetch(
                `https://worktime-dux3.onrender.com/api/salary/update-month`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId,
                        month,
                        year,
                        hourlyRate: newRate
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Reload data to get updated rates
                    await loadSalaryData();
                    setEditingRate(null);
                    alert('Cập nhật mức lương thành công!');
                }
            }
        } catch (error) {
            console.error('Error updating hourly rate:', error);
            alert('Có lỗi xảy ra khi cập nhật mức lương!');
        }
    };

    const handleExportSalary = async (userId: string, month: number, year: number) => {
        // Confirm before exporting salary report
        const isConfirmed = confirm(`Bạn có chắc chắn muốn xuất file Excel lương tháng ${month}/${year} cho nhân viên này?`);
        if (!isConfirmed) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Vui lòng đăng nhập lại');
                return;
            }

            const response = await fetch(
                `https://worktime-dux3.onrender.com/api/salary/export/${userId}/${month}/${year}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `luong_${userId}_${month}_${year}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Error exporting salary:', error);
            alert('Có lỗi xảy ra khi xuất báo cáo!');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatHours = (hours: number) => {
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        return `${wholeHours}h ${minutes}m`;
    };

    const getUserId = (userId: string | { _id: string; name: string; username: string; email: string }) => {
        return typeof userId === 'string' ? userId : userId._id;
    };

    const getEmployeeName = (record: SalaryRecord) => {
        if (typeof record.userId === 'object' && record.userId.name) {
            return record.userId.name;
        }
        return record.name || 'N/A';
    };

    if (!isAdmin) {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center">
                <p className="text-red-600">Bạn không có quyền truy cập trang này!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-1 sm:mb-2 flex items-center">
                            <DollarSign className="h-6 w-6 mr-2 text-green-600" />
                            Quản lý lương
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600">Tính lương và quản lý mức lương nhân viên</p>
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => changeMonth('prev')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-base sm:text-lg font-semibold text-gray-800 min-w-[100px] sm:min-w-[120px] text-center">
                                {format(selectedMonth, 'MMMM yyyy', { locale: vi })}
                            </span>
                            <button
                                onClick={() => changeMonth('next')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center">
                            <Users className="h-8 w-8 text-blue-600 mr-3" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Tổng nhân viên</p>
                                <p className="text-2xl font-bold text-gray-900">{summary.totalEmployees}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center">
                            <Clock className="h-8 w-8 text-green-600 mr-3" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Tổng giờ làm</p>
                                <p className="text-2xl font-bold text-gray-900">{formatHours(summary.totalHours)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center">
                            <DollarSign className="h-8 w-8 text-yellow-600 mr-3" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Tổng lương</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalSalary)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Salary Table */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Bảng lương tháng {format(selectedMonth, 'MM/yyyy', { locale: vi })}</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Đang tải dữ liệu...</p>
                    </div>
                ) : salaryRecords.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nhân viên
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Mức lương/giờ
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tổng giờ
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tổng lương
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {salaryRecords.map((record) => (
                                    <tr key={getUserId(record.userId)} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{getEmployeeName(record)}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {editingRate?.userId === getUserId(record.userId) ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={editingRate.rate}
                                                        onChange={(e) => setEditingRate(prev =>
                                                            prev ? { ...prev, rate: parseFloat(e.target.value) || 0 } : null
                                                        )}
                                                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                        min="0"
                                                        step="1000"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateRate(getUserId(record.userId), editingRate.rate)}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingRate(null)}
                                                        className="text-gray-600 hover:text-gray-900"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-900">{formatCurrency(record.hourlyRate)}</span>
                                                    <button
                                                        onClick={() => setEditingRate({ userId: getUserId(record.userId), rate: record.hourlyRate })}
                                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-md transition-colors"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatHours(record.totalHours)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(record.totalSalary)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleCalculateSalary(getUserId(record.userId), selectedMonth.getMonth() + 1, selectedMonth.getFullYear())}
                                                    disabled={calculateLoading}
                                                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 disabled:text-gray-400 p-2 rounded-md transition-colors"
                                                    title="Tính lương"
                                                >
                                                    <DollarSign className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleViewDetailed(getUserId(record.userId), getEmployeeName(record))}
                                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-md transition-colors"
                                                    title="Xem chi tiết lương tháng"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleExportSalary(getUserId(record.userId), selectedMonth.getMonth() + 1, selectedMonth.getFullYear())}
                                                    className="bg-green-50 hover:bg-green-100 text-green-700 p-2 rounded-md transition-colors"
                                                    title="Xuất báo cáo Excel"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Chưa có dữ liệu lương cho tháng này</p>
                    </div>
                )}
            </div>

            {/* Modal kết quả tính lương */}
            {showCalculateModal && calculateResult && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-gray-200 relative z-10">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Kết quả tính lương - {getEmployeeName(calculateResult)}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Tháng {calculateResult.month}/{calculateResult.year}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCalculateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <DollarSign className="h-6 w-6 text-blue-600 mr-2" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Mức lương/giờ</p>
                                            <p className="text-xl font-bold text-blue-700">{formatCurrency(calculateResult.hourlyRate)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <Clock className="h-6 w-6 text-green-600 mr-2" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Tổng giờ làm</p>
                                            <p className="text-xl font-bold text-green-700">{formatHours(calculateResult.totalHours)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <TrendingUp className="h-6 w-6 text-yellow-600 mr-2" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Tổng lương</p>
                                            <p className="text-xl font-bold text-yellow-700">{formatCurrency(calculateResult.totalSalary)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Daily Records */}
                            {calculateResult.dailyRecords && calculateResult.dailyRecords.length > 0 && (
                                <div>
                                    <h4 className="text-md font-semibold text-gray-900 mb-4">Chi tiết từng ngày</h4>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Ngày
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Giờ vào
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Giờ ra
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Số giờ
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Lương ngày
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Trạng thái
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {calculateResult.dailyRecords.map((record, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {new Date(record.date).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {formatHours(record.workHours)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {formatCurrency(record.dailySalary)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                record.status === 'incomplete' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                                }`}>
                                                                {record.status === 'completed' ? 'Hoàn thành' :
                                                                    record.status === 'incomplete' ? 'Chưa hoàn thành' :
                                                                        'Không hợp lệ'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end p-6 border-t">
                            <button
                                onClick={() => {
                                    setShowCalculateModal(false);
                                    // Reload salary data to show updated information
                                    loadSalaryData();
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                            >
                                Đóng và cập nhật
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal chi tiết lương tháng */}
            {showDetailedModal && selectedUser && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-gray-200 relative z-10">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Chi tiết lương - {selectedUser.name}</h3>
                                <p className="text-sm text-gray-600">Tháng {format(selectedMonth, 'MM/yyyy', { locale: vi })}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => detailedSalary && handleExportSalary(
                                        typeof detailedSalary.userId === 'string' ? detailedSalary.userId : detailedSalary.userId._id,
                                        detailedSalary.month,
                                        detailedSalary.year
                                    )}
                                    className="bg-green-50 hover:bg-green-100 text-green-700 p-2 rounded-md"
                                    title="Xuất Excel"
                                >
                                    <Download className="h-4 w-4" />
                                </button>
                                <button onClick={() => setShowDetailedModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {detailedLoading || !detailedSalary ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Đang tải chi tiết lương...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-600">Tổng lương ngày</p>
                                            <p className="text-lg font-semibold">{formatCurrency(detailedSalary.totalSalary || 0)}</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4">
                                            <p className="text-sm text-green-700">Tổng cộng</p>
                                            <p className="text-lg font-semibold text-green-700">{formatCurrency(detailedSalary.totalBonus || 0)}</p>
                                        </div>
                                        <div className="bg-red-50 rounded-lg p-4">
                                            <p className="text-sm text-red-700">Tổng trừ</p>
                                            <p className="text-lg font-semibold text-red-700">{formatCurrency(detailedSalary.totalDeduction || 0)}</p>
                                        </div>
                                        <div className="bg-yellow-50 rounded-lg p-4">
                                            <p className="text-sm text-yellow-700">Lương cuối cùng</p>
                                            <p className="text-lg font-semibold text-yellow-700">{formatCurrency(detailedSalary.finalSalary || 0)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-md font-semibold text-gray-900 mb-3">Lương theo ngày</h4>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giờ vào</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giờ ra</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số giờ</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức lương/giờ</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lương ngày</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lưu</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {(detailedSalary.dailyRecords || []).map((r) => {
                                                        const key = r.date;
                                                        const editedDailySalary = editDailyMap[key] ?? r.dailySalary;
                                                        const editedHourlyRate = editHourlyRateMap[key] ?? detailedSalary.hourlyRate ?? 0;
                                                        return (
                                                            <tr key={key} className="hover:bg-gray-50">
                                                                <td className="px-6 py-3 text-sm">{new Date(r.date).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</td>
                                                                <td className="px-6 py-3 text-sm">{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}</td>
                                                                <td className="px-6 py-3 text-sm">{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}</td>
                                                                <td className="px-6 py-3 text-sm">{formatHours(r.workHours)}</td>
                                                                <td className="px-6 py-3 text-sm">
                                                                    <input
                                                                        type="number"
                                                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                                                        value={editedHourlyRate}
                                                                        min={0}
                                                                        step={1000}
                                                                        onChange={(e) => setEditHourlyRateMap((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-3 text-sm">
                                                                    <input
                                                                        type="number"
                                                                        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                                                                        value={editedDailySalary}
                                                                        min={0}
                                                                        step={1000}
                                                                        onChange={(e) => setEditDailyMap((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-3 text-sm">
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                                                            onClick={() => handleSaveHourlyRate(r.date, editedHourlyRate)}
                                                                            title="Lưu mức lương/giờ"
                                                                        >
                                                                            Lưu
                                                                        </button>
                                                                        <button
                                                                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                                                            onClick={() => handleSaveDailySalary(r.date, editedDailySalary)}
                                                                            title="Lưu lương ngày"
                                                                        >
                                                                            Lưu
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-900 mb-3">Khoản cộng</h4>
                                            <div className="space-y-2 mb-3">
                                                {(detailedSalary.bonuses || []).length ? (detailedSalary.bonuses || []).map((b) => (
                                                    <div key={b._id} className="flex items-center justify-between bg-green-50 border border-green-100 rounded p-2">
                                                        <div>
                                                            <div className="text-sm font-medium text-green-800">{formatCurrency(b.amount)}</div>
                                                            <div className="text-xs text-green-700">{b.reason}</div>
                                                            <div className="text-[11px] text-green-600">{new Date(b.createdAt).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</div>
                                                        </div>
                                                        <button onClick={() => handleDeleteBonus(b._id)} className="text-red-600 hover:text-red-800 text-sm">Xóa</button>
                                                    </div>
                                                )) : <div className="text-sm text-gray-500">Chưa có khoản cộng</div>}
                                            </div>
                                            <div className="flex gap-2">
                                                <input type="number" className="w-32 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="Số tiền" value={newBonus.amount} onChange={(e) => setNewBonus({ ...newBonus, amount: parseFloat(e.target.value) || 0 })} />
                                                <input type="text" className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="Lý do" value={newBonus.reason} onChange={(e) => setNewBonus({ ...newBonus, reason: e.target.value })} />
                                                <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm" onClick={handleAddBonus}>Thêm</button>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-md font-semibold text-gray-900 mb-3">Khoản trừ</h4>
                                            <div className="space-y-2 mb-3">
                                                {(detailedSalary.deductions || []).length ? (detailedSalary.deductions || []).map((d) => (
                                                    <div key={d._id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded p-2">
                                                        <div>
                                                            <div className="text-sm font-medium text-red-800">{formatCurrency(d.amount)}</div>
                                                            <div className="text-xs text-red-700">{d.reason}</div>
                                                            <div className="text-[11px] text-red-600">{new Date(d.createdAt).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</div>
                                                        </div>
                                                        <button onClick={() => handleDeleteDeduction(d._id)} className="text-red-600 hover:text-red-800 text-sm">Xóa</button>
                                                    </div>
                                                )) : <div className="text-sm text-gray-500">Chưa có khoản trừ</div>}
                                            </div>
                                            <div className="flex gap-2">
                                                <input type="number" className="w-32 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="Số tiền" value={newDeduction.amount} onChange={(e) => setNewDeduction({ ...newDeduction, amount: parseFloat(e.target.value) || 0 })} />
                                                <input type="text" className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="Lý do" value={newDeduction.reason} onChange={(e) => setNewDeduction({ ...newDeduction, reason: e.target.value })} />
                                                <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm" onClick={handleAddDeduction}>Thêm</button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center justify-end p-6 border-t">
                            <button onClick={() => { setShowDetailedModal(false); loadSalaryData(); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">Đóng và cập nhật</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryManagement;
