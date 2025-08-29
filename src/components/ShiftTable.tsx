'use client';

import React, { useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ShiftTableProps,
    ShiftType,
    EmployeeShift,
    DAY_NAMES,
    SHIFT_LABELS,
    SHIFT_TIMES
} from './ShiftTableTypes';
import Popup, { PopupType } from './Popup';

const ShiftTable: React.FC<ShiftTableProps> = ({
    userId,
    userName,
    isAdmin,
    weekStartDate
}) => {
    // Demo data - sẽ được thay thế bằng dữ liệu từ API
    const [currentDate, setCurrentDate] = useState<Date>(weekStartDate || new Date());
    const [employees, setEmployees] = useState<EmployeeShift[]>([
        {
            userId: userId,
            username: userName,
            shifts: { 1: 'off', 2: 'off', 3: 'off', 4: 'off', 5: 'off', 6: 'off', 7: 'off' }
        },
        {
            userId: 'user2',
            username: 'Nguyễn Văn A',
            shifts: { 1: 'morning', 2: 'afternoon', 3: 'off', 4: 'morning', 5: 'off', 6: 'off', 7: 'off' }
        },
        {
            userId: 'user3',
            username: 'Trần Thị B',
            shifts: { 1: 'off', 2: 'off', 3: 'evening', 4: 'evening', 5: 'afternoon', 6: 'off', 7: 'off' }
        }
    ]);
    const [liveEvents, setLiveEvents] = useState<Record<number, ShiftType>>({
        1: 'off',
        2: 'afternoon',
        3: 'off',
        4: 'evening',
        5: 'morning',
        6: 'off',
        7: 'off'
    });
    // const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [messageType, setMessageType] = useState<PopupType>('');

    // Chuyển tuần trước/sau
    const goToPreviousWeek = () => {
        setCurrentDate(prevDate => subWeeks(prevDate, 1));
    };

    const goToNextWeek = () => {
        setCurrentDate(prevDate => addWeeks(prevDate, 1));
    };

    // Lấy ngày đầu và cuối của tuần hiện tại
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Thứ 2
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Chủ nhật

    // Tính tổng số buổi làm việc của mỗi nhân viên
    const calculateTotalShifts = (employeeShifts: Record<number, ShiftType>): number => {
        return Object.values(employeeShifts).filter(shift => shift !== 'off').length;
    };

    // Thay đổi ca làm việc
    const handleShiftChange = (empUserId: string, day: number, newShift: ShiftType) => {
        // Chỉ cho phép thay đổi ca làm của bản thân hoặc admin thay đổi ca live
        if ((empUserId === userId) || (isAdmin && empUserId === 'live')) {
            if (empUserId === 'live') {
                // Cập nhật ca Live (chỉ admin)
                setLiveEvents(prev => ({
                    ...prev,
                    [day]: newShift
                }));
            } else {
                // Cập nhật ca làm việc của nhân viên
                setEmployees(prev => prev.map(emp =>
                    emp.userId === empUserId
                        ? { ...emp, shifts: { ...emp.shifts, [day]: newShift } }
                        : emp
                ));
            }

            // Hiển thị thông báo thành công
            const dayName = DAY_NAMES[day - 1];
            const shiftName = SHIFT_LABELS[newShift];

            if (empUserId === 'live') {
                setMessage(`Đã cập nhật buổi Live ${dayName} thành ${shiftName}`);
            } else {
                setMessage(`Đã đăng ký ca làm việc ${dayName} (${shiftName})`);
            }
            setMessageType('success');

            // TODO: Gửi dữ liệu đến API
        }
    };

    // Class cho các ô ca làm việc
    const getShiftCellClass = (shift: ShiftType, isEditable: boolean) => {
        const baseClass = "text-xs p-2 text-center border border-gray-200";

        if (!isEditable) return `${baseClass} bg-gray-50 cursor-not-allowed`;

        const shiftClasses = {
            morning: "bg-blue-50 hover:bg-blue-100 cursor-pointer text-gray-800",
            noon: "bg-green-50 hover:bg-green-100 cursor-pointer text-gray-800",
            afternoon: "bg-yellow-50 hover:bg-yellow-100 cursor-pointer text-gray-800",
            evening: "bg-purple-50 hover:bg-purple-100 cursor-pointer text-gray-800",
            off: "bg-gray-50 hover:bg-gray-100 cursor-pointer text-gray-800"
        };

        return `${baseClass} ${shiftClasses[shift]}`;
    };

    // Class cho hàng ca Live
    const getLiveCellClass = (shift: ShiftType) => {
        const baseClass = "text-xs p-2 text-center border border-gray-200";

        if (!isAdmin) return `${baseClass} cursor-not-allowed`;

        const shiftClasses = {
            morning: "bg-red-50 hover:bg-red-100 text-gray-800",
            noon: "bg-red-50 hover:bg-red-100 text-gray-800",
            afternoon: "bg-red-50 hover:bg-red-100 text-gray-800",
            evening: "bg-red-50 hover:bg-red-100 text-gray-800",
            off: "bg-gray-50 hover:bg-gray-100 text-gray-800"
        };

        return `${baseClass} ${shiftClasses[shift]} ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}`;
    };

    // Dropdown chọn ca làm việc
    const renderShiftDropdown = (employeeId: string, day: number, currentShift: ShiftType) => {
        const isEditable = employeeId === userId || (isAdmin && employeeId === 'live');
        const isLiveRow = employeeId === 'live';

        const baseClass = isLiveRow
            ? getLiveCellClass(currentShift)
            : getShiftCellClass(currentShift, isEditable);

        // Nếu không được phép chỉnh sửa, chỉ hiển thị ca làm hiện tại
        if (!isEditable) {
            return (
                <div className={baseClass}>
                    {SHIFT_LABELS[currentShift]}
                </div>
            );
        }

        // Nếu được phép chỉnh sửa, hiển thị dropdown
        return (
            <select
                value={currentShift}
                onChange={(e) => handleShiftChange(employeeId, day, e.target.value as ShiftType)}
                className={`${baseClass} appearance-none w-full outline-none text-gray-800`}
            >
                {Object.entries(SHIFT_LABELS).map(([value, label]) => (
                    <option key={value} value={value} className="text-gray-800 bg-white">
                        {label}
                    </option>
                ))}
            </select>
        );
    };

    return (
        <div className="space-y-4">
            {/* Header và điều hướng */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4 sm:mb-0">
                    <CalendarClock className="h-5 w-5 mr-2 text-blue-600" />
                    Đăng ký ca làm việc
                </h2>

                <div className="flex items-center space-x-1">
                    <button
                        onClick={goToPreviousWeek}
                        className="p-2 text-gray-600 hover:text-blue-600 rounded-full"
                        aria-label="Tuần trước"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm">
                            {format(weekStart, 'dd/MM', { locale: vi })} - {format(weekEnd, 'dd/MM/yyyy', { locale: vi })}
                        </span>
                    </div>

                    <button
                        onClick={goToNextWeek}
                        className="p-2 text-gray-600 hover:text-blue-600 rounded-full"
                        aria-label="Tuần sau"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Popup thông báo */}
            <Popup
                message={message}
                type={messageType}
                onClose={() => {
                    setMessage('');
                    setMessageType('');
                }}
            />

            {/* Hướng dẫn */}
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-xs text-blue-700">
                    {isAdmin
                        ? 'Bạn có thể đăng ký ca làm việc cho mình và quản lý lịch Live.'
                        : 'Bạn chỉ có thể đăng ký ca làm việc cho chính mình.'}
                </p>
            </div>

            {/* Bảng đăng ký ca làm việc */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                                Nhân viên
                            </th>
                            {DAY_NAMES.map((day, index) => (
                                <th key={index} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {day}
                                </th>
                            ))}
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tổng buổi
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Danh sách nhân viên */}
                        {employees.map((employee) => (
                            <tr key={employee.userId} className={employee.userId === userId ? "bg-blue-50" : ""}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {employee.username} {employee.userId === userId && " (Bạn)"}
                                </td>

                                {/* Các ngày trong tuần */}
                                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                    <td key={day} className="whitespace-nowrap">
                                        {renderShiftDropdown(employee.userId, day, employee.shifts[day])}
                                    </td>
                                ))}

                                {/* Tổng số buổi */}
                                <td className="px-3 py-2 whitespace-nowrap text-center text-sm font-medium text-gray-800">
                                    {calculateTotalShifts(employee.shifts)}
                                </td>
                            </tr>
                        ))}

                        {/* Hàng Live */}
                        <tr className="bg-red-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-red-800">
                                Lịch Live
                            </td>

                            {/* Các ngày trong tuần */}
                            {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                <td key={day} className="whitespace-nowrap">
                                    {renderShiftDropdown('live', day, liveEvents[day])}
                                </td>
                            ))}

                            {/* Tổng số buổi */}
                            <td className="px-3 py-2 whitespace-nowrap text-center text-sm font-medium text-gray-800">
                                {calculateTotalShifts(liveEvents)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Chú thích */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xs font-medium text-gray-700 mb-1">Chú thích:</h3>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-blue-100 rounded-sm"></div>
                        <span className="text-xs text-gray-700">Sáng ({SHIFT_TIMES.morning})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-green-100 rounded-sm"></div>
                        <span className="text-xs text-gray-700">Trưa ({SHIFT_TIMES.noon})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-yellow-100 rounded-sm"></div>
                        <span className="text-xs text-gray-700">Chiều ({SHIFT_TIMES.afternoon})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-purple-100 rounded-sm"></div>
                        <span className="text-xs text-gray-700">Tối ({SHIFT_TIMES.evening})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-100 rounded-sm"></div>
                        <span className="text-xs text-gray-700">Buổi Live</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShiftTable;
