'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Save, X, Edit, DollarSign, Plus, User } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DailyRecord {
    date: string;
    dayOfWeek: number;
    records: AttendanceRecord[];
}

interface AttendanceRecord {
    id: string;
    checkInTime: string;
    checkOutTime?: string;
    status: 'checked-in' | 'checked-out' | 'absent';
    workDuration?: number;
    workTimeFormatted?: string;
    officeId: string;
    notes?: string;
    isValid: boolean;
}

interface EmployeeAttendance {
    userId: string;
    name: string;
    email: string;
    username: string;
    attendanceDays: string;    // Format: "20/31"
    attendanceRatio: string;   // Format: "65%"
    dailyRecords: DailyRecord[];
}

interface UserForManual {
    id: string;
    name: string;
    username: string;
    email: string;
    hourlyRate: number;
}

interface ManualAttendanceForm {
    userId: string;
    date: string;
    checkInTime: string;
    checkOutTime: string;
    notes: string;
}


interface AttendanceManagementProps {
    isAdmin: boolean;
}

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ isAdmin }) => {
    const [employees, setEmployees] = useState<EmployeeAttendance[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAttendance | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [calculatingSalary, setCalculatingSalary] = useState<string | null>(null);
    const [showManualModal, setShowManualModal] = useState(false);
    const [usersForManual, setUsersForManual] = useState<UserForManual[]>([]);
    const [manualForm, setManualForm] = useState<ManualAttendanceForm>({
        userId: '',
        date: '',
        checkInTime: '',
        checkOutTime: '',
        notes: ''
    });
    const [manualLoading, setManualLoading] = useState(false);

    const loadEmployeesAttendance = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const month = selectedMonth.getMonth() + 1; // 1-12
            const year = selectedMonth.getFullYear();

            const response = await fetch(
                `https://worktime-dux3.onrender.com/api/attendance/admin/monthly-summary?month=${month}&year=${year}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('Monthly summary API response:', data);
                if (data.success) {
                    setEmployees(data.data?.summary || []);
                }
            }
        } catch (error) {
            console.error('Error loading attendance summary:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => {
        loadEmployeesAttendance();
    }, [selectedMonth, loadEmployeesAttendance]);

    const loadUsersForManual = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found');
                return;
            }

            console.log('🔍 Loading users for manual attendance...');

            // Thử API mới trước
            let response = await fetch('https://worktime-dux3.onrender.com/api/attendance/users-for-manual', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status, response.statusText);

            // Nếu API mới không tồn tại (404/400), thử API cũ
            if (!response.ok && (response.status === 404 || response.status === 400)) {
                console.log('🔄 New API not available, trying fallback API...');
                response = await fetch('https://worktime-dux3.onrender.com/api/users', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log('📡 Fallback API status:', response.status, response.statusText);
            }

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Users data:', data);

                if (data.success) {
                    // API mới
                    if (data.data?.users) {
                        setUsersForManual(data.data.users || []);
                    }
                    // API cũ - chuyển đổi format
                    else if (data.data?.users || data.users) {
                        const users = data.data?.users || data.users || [];
                        const convertedUsers = users
                            .filter((user: any) => user.role !== 'admin') // Lọc bỏ admin
                            .map((user: any) => ({
                                id: user._id || user.id,
                                name: user.name,
                                username: user.username,
                                email: user.email,
                                hourlyRate: user.hourlyRate || 0
                            }));
                        setUsersForManual(convertedUsers);
                    }
                }
            } else {
                console.error('❌ API Error:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error Response:', errorText);
                alert(`Lỗi tải danh sách nhân viên: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('Error loading users for manual:', error);
            alert('Có lỗi xảy ra khi tải danh sách nhân viên');
        }
    };

    const handleOpenManualModal = () => {
        setShowManualModal(true);
        setManualForm({
            userId: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            checkInTime: '08:00',
            checkOutTime: '17:00',
            notes: ''
        });
        loadUsersForManual();
    };

    const handleCreateManualRecord = async () => {
        if (!manualForm.userId || !manualForm.date || !manualForm.checkInTime || !manualForm.checkOutTime) {
            alert('Vui lòng điền đầy đủ thông tin');
            return;
        }

        try {
            setManualLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Vui lòng đăng nhập lại');
                return;
            }

            const response = await fetch('https://worktime-dux3.onrender.com/api/attendance/manual-record', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(manualForm)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    alert('Đã tạo bản ghi chấm công thủ công thành công!');
                    setShowManualModal(false);
                    // Reload data
                    loadEmployeesAttendance();
                } else {
                    alert(data.message || 'Có lỗi xảy ra khi tạo bản ghi chấm công');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.message || 'Có lỗi xảy ra khi tạo bản ghi chấm công');
            }
        } catch (error) {
            console.error('Error creating manual record:', error);
            alert('Có lỗi xảy ra khi tạo bản ghi chấm công');
        } finally {
            setManualLoading(false);
        }
    };

    const loadEmployeeAttendance = async (employee: EmployeeAttendance) => {
        try {
            // Extract all records from dailyRecords
            const allRecords: AttendanceRecord[] = [];
            employee.dailyRecords.forEach(day => {
                day.records.forEach(record => {
                    allRecords.push(record);
                });
            });

            setAttendanceRecords(allRecords);
            setSelectedEmployee(employee);
            setShowAttendanceModal(true);
        } catch (error) {
            console.error('Error loading employee attendance:', error);
        }
    };

    const handleEditRecord = (record: AttendanceRecord) => {
        setEditingRecord(record);
    };

    const handleSaveRecord = async (record: AttendanceRecord) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Prepare update data
            const updateData: {
                checkInTime?: string;
                checkOutTime?: string;
                notes?: string;
                officeId?: string;
            } = {};

            if (record.checkInTime) updateData.checkInTime = record.checkInTime;
            if (record.checkOutTime) updateData.checkOutTime = record.checkOutTime;
            if (record.notes) updateData.notes = record.notes;
            if (record.officeId) updateData.officeId = record.officeId;

            const response = await fetch(
                `https://worktime-dux3.onrender.com/api/attendance/admin/${record.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAttendanceRecords(prev => prev.map(r =>
                        r.id === record.id ? record : r
                    ));
                    setEditingRecord(null);
                    alert('Cập nhật thành công!');
                    // Reload data to get updated records
                    loadEmployeesAttendance();
                }
            }
        } catch (error) {
            console.error('Error updating attendance record:', error);
            alert('Có lỗi xảy ra khi cập nhật!');
        }
    };

    const handleCalculateSalary = async (userId: string, name: string) => {
        try {
            setCalculatingSalary(userId);
            const token = localStorage.getItem('token');
            if (!token) return;

            const month = selectedMonth.getMonth() + 1;
            const year = selectedMonth.getFullYear();

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
                    const result = data.data;
                    alert(`Tính lương thành công cho ${name}!\n\n` +
                        `Tháng: ${month}/${year}\n` +
                        `Mức lương/giờ: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.hourlyRate)}\n` +
                        `Tổng giờ: ${Math.floor(result.totalHours)}h ${Math.round((result.totalHours - Math.floor(result.totalHours)) * 60)}m\n` +
                        `Tổng lương: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.totalSalary)}`);
                } else {
                    alert('Không thể tính lương. Vui lòng kiểm tra dữ liệu chấm công.');
                }
            } else {
                alert('Có lỗi xảy ra khi tính lương!');
            }
        } catch (error) {
            console.error('Error calculating salary:', error);
            alert('Có lỗi xảy ra khi tính lương!');
        } finally {
            setCalculatingSalary(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'checked-out': return 'bg-green-100 text-green-800';
            case 'checked-in': return 'bg-blue-100 text-blue-800';
            case 'absent': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'checked-out': return 'Đã check-out';
            case 'checked-in': return 'Đang làm việc';
            case 'absent': return 'Vắng mặt';
            default: return 'Không xác định';
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

    if (!isAdmin) {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center">
                <p className="text-red-600">Bạn không có quyền truy cập trang này!</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center">
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">Quản lý chấm công</h2>
                        <p className="text-sm sm:text-base text-gray-600">Theo dõi và quản lý lịch sử chấm công của nhân viên</p>
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-4">
                        {isAdmin && (
                            <button
                                onClick={handleOpenManualModal}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">Thêm chấm công thủ công</span>
                                <span className="sm:hidden">Thêm</span>
                            </button>
                        )}
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

            {/* Employee List */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tên nhân viên
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Số ngày chấm công
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tỷ lệ
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employees.map((employee) => (
                                <tr key={employee.userId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {employee.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {employee.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {employee.attendanceDays}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: employee.attendanceRatio }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {employee.attendanceRatio}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => loadEmployeeAttendance(employee)}
                                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-md transition-colors"
                                                title="Xem chi tiết chấm công"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleCalculateSalary(employee.userId, employee.name)}
                                                disabled={calculatingSalary === employee.userId}
                                                className="bg-purple-50 hover:bg-purple-100 text-purple-700 disabled:text-gray-400 p-2 rounded-md transition-colors"
                                                title="Tính lương"
                                            >
                                                <DollarSign className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                    <div className="p-4 space-y-4">
                        {employees.map((employee) => (
                            <div key={employee.userId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">{employee.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => loadEmployeeAttendance(employee)}
                                            className="text-blue-600 hover:text-blue-900 p-2"
                                            title="Xem chi tiết chấm công"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleCalculateSalary(employee.userId, employee.name)}
                                            disabled={calculatingSalary === employee.userId}
                                            className="text-purple-600 hover:text-purple-900 disabled:text-gray-400 p-2"
                                            title="Tính lương"
                                        >
                                            <DollarSign className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Số ngày chấm công:</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {employee.attendanceDays}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Tỷ lệ:</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: employee.attendanceRatio }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {employee.attendanceRatio}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Attendance Detail Modal */}
            {showAttendanceModal && selectedEmployee && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-gray-200 relative z-10">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Chi tiết chấm công - {selectedEmployee.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {format(selectedMonth, 'MMMM yyyy', { locale: vi })}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAttendanceModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Ngày
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Giờ vào
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Giờ ra
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Văn phòng
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Thời gian làm việc
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Trạng thái
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Thao tác
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {attendanceRecords.map((record) => (
                                            <tr key={record.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {editingRecord?.id === record.id ? (
                                                        <input
                                                            type="date"
                                                            value={editingRecord.checkInTime ? new Date(editingRecord.checkInTime).toISOString().slice(0, 10) : ''}
                                                            onChange={(e) => {
                                                                const value = e.target.value; // YYYY-MM-DD
                                                                const currentDate = new Date(editingRecord.checkInTime);
                                                                const [y, m, d] = value.split('-').map(v => parseInt(v));
                                                                currentDate.setUTCFullYear(y);
                                                                currentDate.setUTCMonth(m - 1);
                                                                currentDate.setUTCDate(d);
                                                                setEditingRecord(prev =>
                                                                    prev ? { ...prev, checkInTime: currentDate.toISOString() } : null
                                                                );
                                                            }}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    ) : (
                                                        new Date(record.checkInTime).toLocaleDateString('vi-VN', { timeZone: 'UTC' })
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {editingRecord?.id === record.id ? (
                                                        <input
                                                            type="time"
                                                            value={editingRecord.checkInTime ? new Date(editingRecord.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) : ''}
                                                            onChange={(e) => {
                                                                const currentDate = new Date(editingRecord.checkInTime);
                                                                const [hours, minutes] = e.target.value.split(':');
                                                                currentDate.setUTCHours(parseInt(hours), parseInt(minutes));
                                                                setEditingRecord(prev =>
                                                                    prev ? { ...prev, checkInTime: currentDate.toISOString() } : null
                                                                );
                                                            }}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    ) : (
                                                        record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) : '--:--'
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {editingRecord?.id === record.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="date"
                                                                value={editingRecord.checkOutTime ? new Date(editingRecord.checkOutTime).toISOString().slice(0, 10) : (editingRecord.checkInTime ? new Date(editingRecord.checkInTime).toISOString().slice(0, 10) : '')}
                                                                onChange={(e) => {
                                                                    const value = e.target.value; // YYYY-MM-DD
                                                                    const base = new Date(editingRecord.checkOutTime || editingRecord.checkInTime || new Date().toISOString());
                                                                    const [y, m, d] = value.split('-').map(v => parseInt(v));
                                                                    base.setUTCFullYear(y);
                                                                    base.setUTCMonth(m - 1);
                                                                    base.setUTCDate(d);
                                                                    setEditingRecord(prev =>
                                                                        prev ? { ...prev, checkOutTime: base.toISOString() } : null
                                                                    );
                                                                }}
                                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                            <input
                                                                type="time"
                                                                value={editingRecord.checkOutTime ? new Date(editingRecord.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) : ''}
                                                                onChange={(e) => {
                                                                    const currentDate = new Date(editingRecord.checkOutTime || new Date());
                                                                    const [hours, minutes] = e.target.value.split(':');
                                                                    currentDate.setUTCHours(parseInt(hours), parseInt(minutes));
                                                                    setEditingRecord(prev =>
                                                                        prev ? { ...prev, checkOutTime: currentDate.toISOString() } : null
                                                                    );
                                                                }}
                                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                        </div>
                                                    ) : (
                                                        record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) : '--:--'
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {editingRecord?.id === record.id ? (
                                                        <input
                                                            type="text"
                                                            value={editingRecord.officeId || ''}
                                                            onChange={(e) => setEditingRecord(prev =>
                                                                prev ? { ...prev, officeId: e.target.value } : null
                                                            )}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="h-3 w-3 text-gray-400" />
                                                            {record.officeId || 'N/A'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {record.workTimeFormatted || 'N/A'}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                                                        {getStatusText(record.status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                    {editingRecord?.id === record.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleSaveRecord(editingRecord)}
                                                                className="text-green-600 hover:text-green-900"
                                                            >
                                                                <Save className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingRecord(null)}
                                                                className="text-gray-600 hover:text-gray-900"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEditRecord(record)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden p-6">
                            <div className="space-y-4">
                                {attendanceRecords.map((record) => (
                                    <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-900">
                                                    {editingRecord?.id === record.id ? (
                                                        <input
                                                            type="date"
                                                            value={editingRecord.checkInTime ? new Date(editingRecord.checkInTime).toISOString().slice(0, 10) : ''}
                                                            onChange={(e) => {
                                                                const value = e.target.value; // YYYY-MM-DD
                                                                const currentDate = new Date(editingRecord.checkInTime);
                                                                const [y, m, d] = value.split('-').map(v => parseInt(v));
                                                                currentDate.setUTCFullYear(y);
                                                                currentDate.setUTCMonth(m - 1);
                                                                currentDate.setUTCDate(d);
                                                                setEditingRecord(prev =>
                                                                    prev ? { ...prev, checkInTime: currentDate.toISOString() } : null
                                                                );
                                                            }}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    ) : (
                                                        new Date(record.checkInTime).toLocaleDateString('vi-VN', { timeZone: 'UTC' })
                                                    )}
                                                </span>
                                            </div>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                                                {getStatusText(record.status)}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {editingRecord?.id === record.id ? (
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="time"
                                                                value={editingRecord.checkInTime ? new Date(editingRecord.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) : ''}
                                                                onChange={(e) => {
                                                                    const currentDate = new Date(editingRecord.checkInTime);
                                                                    const [hours, minutes] = e.target.value.split(':');
                                                                    currentDate.setUTCHours(parseInt(hours), parseInt(minutes));
                                                                    setEditingRecord(prev =>
                                                                        prev ? { ...prev, checkInTime: currentDate.toISOString() } : null
                                                                    );
                                                                }}
                                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                            <span>-</span>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="date"
                                                                    value={editingRecord.checkOutTime ? new Date(editingRecord.checkOutTime).toISOString().slice(0, 10) : (editingRecord.checkInTime ? new Date(editingRecord.checkInTime).toISOString().slice(0, 10) : '')}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        const base = new Date(editingRecord.checkOutTime || editingRecord.checkInTime || new Date().toISOString());
                                                                        const [y, m, d] = value.split('-').map(v => parseInt(v));
                                                                        base.setUTCFullYear(y);
                                                                        base.setUTCMonth(m - 1);
                                                                        base.setUTCDate(d);
                                                                        setEditingRecord(prev =>
                                                                            prev ? { ...prev, checkOutTime: base.toISOString() } : null
                                                                        );
                                                                    }}
                                                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                                />
                                                                <input
                                                                    type="time"
                                                                    value={editingRecord.checkOutTime ? new Date(editingRecord.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) : ''}
                                                                    onChange={(e) => {
                                                                        const currentDate = new Date(editingRecord.checkOutTime || new Date());
                                                                        const [hours, minutes] = e.target.value.split(':');
                                                                        currentDate.setUTCHours(parseInt(hours), parseInt(minutes));
                                                                        setEditingRecord(prev =>
                                                                            prev ? { ...prev, checkOutTime: currentDate.toISOString() } : null
                                                                        );
                                                                    }}
                                                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        `${record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) : '--:--'} - ${record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) : '--:--'}`
                                                    )}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {editingRecord?.id === record.id ? (
                                                        <input
                                                            type="text"
                                                            value={editingRecord.officeId || ''}
                                                            onChange={(e) => setEditingRecord(prev =>
                                                                prev ? { ...prev, officeId: e.target.value } : null
                                                            )}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                                                        />
                                                    ) : (
                                                        record.officeId || 'N/A'
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {editingRecord?.id === record.id && (
                                            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                                                <button
                                                    onClick={() => handleSaveRecord(editingRecord)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                                >
                                                    <Save className="h-3 w-3" />
                                                    Lưu
                                                </button>
                                                <button
                                                    onClick={() => setEditingRecord(null)}
                                                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-sm flex items-center gap-1"
                                                >
                                                    <X className="h-3 w-3" />
                                                    Hủy
                                                </button>
                                            </div>
                                        )}

                                        {editingRecord?.id !== record.id && (
                                            <button
                                                onClick={() => handleEditRecord(record)}
                                                className="mt-3 text-blue-600 hover:text-blue-900 text-sm flex items-center gap-1"
                                            >
                                                <Edit className="h-3 w-3" />
                                                Chỉnh sửa
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-end p-6 border-t">
                            <button
                                onClick={() => setShowAttendanceModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal chấm công thủ công */}
            {showManualModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-gray-200 relative z-10">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Thêm chấm công thủ công</h3>
                                <p className="text-sm text-gray-600">Tạo bản ghi chấm công cho nhân viên</p>
                            </div>
                            <button
                                onClick={() => setShowManualModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Chọn nhân viên */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Chọn nhân viên *
                                </label>
                                <select
                                    value={manualForm.userId}
                                    onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {usersForManual.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.username}) - {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user.hourlyRate)}/giờ
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Ngày */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ngày *
                                </label>
                                <input
                                    type="date"
                                    value={manualForm.date}
                                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Giờ vào */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Giờ vào *
                                </label>
                                <input
                                    type="time"
                                    value={manualForm.checkInTime}
                                    onChange={(e) => setManualForm({ ...manualForm, checkInTime: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Giờ ra */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Giờ ra *
                                </label>
                                <input
                                    type="time"
                                    value={manualForm.checkOutTime}
                                    onChange={(e) => setManualForm({ ...manualForm, checkOutTime: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Ghi chú */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ghi chú
                                </label>
                                <textarea
                                    value={manualForm.notes}
                                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                                    placeholder="Nhập ghi chú (tùy chọn)"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t">
                            <button
                                onClick={() => setShowManualModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateManualRecord}
                                disabled={manualLoading}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                            >
                                {manualLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Đang tạo...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        Tạo bản ghi
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceManagement;
