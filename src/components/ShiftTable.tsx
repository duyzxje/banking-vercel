'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Calendar, Plus, X } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ShiftTableProps,
    ShiftType,
    EmployeeShift,
    DayShifts,
    DAY_NAMES,
    SHIFT_LABELS
} from './ShiftTableTypes';
import Popup, { PopupType } from './Popup';

const ShiftTable: React.FC<ShiftTableProps> = ({
    userId,
    isAdmin,
    weekStartDate
}) => {
    // State để lưu trữ thông tin modal chọn ca
    const [modalInfo, setModalInfo] = useState<{
        isOpen: boolean,
        employeeId: string,
        day: number,
        dayShifts?: DayShifts | null,
        isLive?: boolean,
        position: { x: number, y: number }
    }>({
        isOpen: false,
        employeeId: '',
        day: 0,
        position: { x: 0, y: 0 }
    });
    const [currentDate, setCurrentDate] = useState<Date>(weekStartDate || new Date());
    const [employees, setEmployees] = useState<EmployeeShift[]>([]);
    const [liveEvents, setLiveEvents] = useState<Record<number, ShiftType>>({});
    // Removed unused loading state

    // Format ngày theo định dạng YYYY-MM-DD
    const formatDateForAPI = (date: Date): string => {
        return format(date, 'yyyy-MM-dd');
    };

    // Tải dữ liệu ca làm việc từ API
    const loadShiftData = useCallback(async () => {
        // Tính toán weekStart từ currentDate mỗi khi hàm được gọi
        // thay vì sử dụng biến bên ngoài để tránh stale closures
        const thisWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Thứ 2

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            console.log(`Loading data for week starting: ${formatDateForAPI(thisWeekStart)}`);

            // Lấy dữ liệu đăng ký ca
            const shiftsResponse = await fetch(
                `https://worktime-dux3.onrender.com/api/shifts?weekStartDate=${formatDateForAPI(thisWeekStart)}`,
                {
                    headers,
                    cache: 'no-store'
                }
            );

            if (shiftsResponse.ok) {
                const shiftsData = await shiftsResponse.json();
                if (shiftsData.success && shiftsData.data) {
                    // Only log once, not in a loop
                    console.log('Loaded employees:', shiftsData.data.employees?.length || 0);
                    setEmployees(shiftsData.data.employees || []);
                }
            }

            // Lấy dữ liệu lịch Live
            const liveResponse = await fetch(
                `https://worktime-dux3.onrender.com/api/live?weekStartDate=${formatDateForAPI(thisWeekStart)}`,
                {
                    headers,
                    cache: 'no-store'
                }
            );

            if (liveResponse.ok) {
                const liveData = await liveResponse.json();
                if (liveData.success && liveData.data) {
                    setLiveEvents(liveData.data.schedule || {});
                }
            }

        } catch (error) {
            console.error('Failed to load shift data:', error);
            setMessage('Không thể tải dữ liệu ca làm việc');
            setMessageType('error');
        }
    }, [currentDate]); // Only depend on currentDate
    const [message, setMessage] = useState<string>('');
    const [messageType, setMessageType] = useState<PopupType>('');

    // Chuyển tuần trước/sau
    const goToPreviousWeek = () => {
        setCurrentDate(prevDate => subWeeks(prevDate, 1));
    };

    const goToNextWeek = () => {
        setCurrentDate(prevDate => addWeeks(prevDate, 1));
    };

    // Load dữ liệu khi thay đổi tuần
    useEffect(() => {
        loadShiftData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDate]);


    // Tính tổng số buổi làm việc của mỗi nhân viên
    const calculateTotalShifts = (employeeShifts: Record<number, DayShifts>): number => {
        let total = 0;
        Object.values(employeeShifts).forEach(dayShift => {
            if (dayShift.morning) total++;
            if (dayShift.noon) total++;
            if (dayShift.afternoon) total++;
            if (dayShift.evening) total++;
        });
        return total;
    };

    // Thay đổi ca làm việc
    const handleShiftToggle = async (empUserId: string, day: number, shiftType: ShiftType) => {
        try {
            // Admin có thể điều chỉnh tất cả, Staff chỉ điều chỉnh ca của mình
            if (isAdmin || (!isAdmin && empUserId === userId)) {
                const token = localStorage.getItem('token');
                if (!token) return;

                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };

                if (empUserId === 'live') {
                    // Cập nhật ca Live (chỉ admin)
                    const response = await fetch('https://worktime-dux3.onrender.com/api/live/update', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            day,
                            shiftType,
                            weekStartDate: formatDateForAPI(startOfWeek(currentDate, { weekStartsOn: 1 }))
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            // Cập nhật state
                            setLiveEvents(prev => ({
                                ...prev,
                                [day]: shiftType
                            }));

                            // Hiển thị thông báo thành công
                            const dayName = DAY_NAMES[day - 1];
                            const shiftName = SHIFT_LABELS[shiftType];
                            setMessage(`Đã cập nhật buổi Live ${dayName} thành ${shiftName}`);
                            setMessageType('success');
                        } else {
                            throw new Error(data.error?.message || 'Có lỗi xảy ra');
                        }
                    } else {
                        throw new Error('Không thể cập nhật lịch Live');
                    }
                } else {
                    // Cập nhật ca làm việc của nhân viên
                    if (shiftType !== 'off') {
                        const response = await fetch('https://worktime-dux3.onrender.com/api/shifts/toggle', {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                userId: empUserId,
                                day,
                                shiftType,
                                weekStartDate: formatDateForAPI(startOfWeek(currentDate, { weekStartsOn: 1 }))
                            })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            if (data.success) {
                                // Cập nhật state
                                setEmployees(prev => prev.map(emp => {
                                    if (emp.userId === empUserId) {
                                        return {
                                            ...emp,
                                            shifts: {
                                                ...emp.shifts,
                                                [day]: data.data.shifts[day]
                                            }
                                        };
                                    }
                                    return emp;
                                }));

                                // Hiển thị thông báo thành công
                                setMessage(data.data.message || 'Đã cập nhật ca làm việc');
                                setMessageType('success');
                            } else {
                                throw new Error(data.error?.message || 'Có lỗi xảy ra');
                            }
                        } else {
                            throw new Error('Không thể cập nhật ca làm việc');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling shift:', error);
            setMessage((error as Error).message || 'Có lỗi xảy ra');
            setMessageType('error');
        }
    };

    // Lấy class cho checkbox theo loại ca - removed unused function

    // Class cho hàng ca Live - removed unused function

    // Hàm mở modal chọn ca
    const openShiftModal = (employeeId: string, day: number, dayShifts: DayShifts | null, isLive: boolean = false, event: React.MouseEvent) => {
        // Tính toán vị trí hiển thị modal dựa trên vị trí click
        const rect = event.currentTarget.getBoundingClientRect();
        const x = rect.left + window.scrollX;
        const y = rect.bottom + window.scrollY;

        setModalInfo({
            isOpen: true,
            employeeId,
            day,
            dayShifts,
            isLive,
            position: { x, y }
        });
    };

    // Đóng modal
    const closeModal = () => {
        setModalInfo(prev => ({ ...prev, isOpen: false }));
    };

    // Render các ca làm việc với giao diện mới theo yêu cầu
    const renderShiftCell = (employeeId: string, day: number, dayShifts: DayShifts) => {
        const isEditable = (employeeId === userId && !isAdmin) || isAdmin;
        const isLiveRow = employeeId === 'live';

        // Nếu là hàng Live và không phải admin thì chỉ hiển thị
        if (isLiveRow && !isAdmin) {
            const currentShift = liveEvents[day];
            if (currentShift === 'off') {
                return <div className="h-10 flex items-center justify-center text-gray-400">-</div>;
            }

            let bgColor, textColor;
            switch (currentShift) {
                case 'morning': bgColor = 'bg-blue-200'; textColor = 'text-blue-800'; break;
                case 'noon': bgColor = 'bg-yellow-200'; textColor = 'text-yellow-800'; break;
                case 'afternoon': bgColor = 'bg-green-200'; textColor = 'text-green-800'; break;
                case 'evening': bgColor = 'bg-purple-200'; textColor = 'text-purple-800'; break;
                default: bgColor = 'bg-red-200'; textColor = 'text-red-800';
            }

            return (
                <div className="p-1 h-full">
                    <div className={`${bgColor} ${textColor} rounded-md py-1 px-2 text-center font-medium`}>
                        {SHIFT_LABELS[currentShift]}
                    </div>
                </div>
            );
        }

        // Nếu là hàng Live và là admin
        if (isLiveRow && isAdmin) {
            const currentShift = liveEvents[day];

            // Hiển thị ca hiện tại hoặc nút thêm ca
            if (currentShift === 'off') {
                return (
                    <div className="p-1">
                        <button
                            className="w-full bg-red-200 text-red-800 py-1 px-2 rounded hover:bg-red-300 transition-colors"
                            onClick={(e) => openShiftModal(employeeId, day, null, true, e)}
                        >
                            Off
                        </button>
                    </div>
                );
            } else {
                let bgColor, textColor;
                switch (currentShift) {
                    case 'morning': bgColor = 'bg-blue-200'; textColor = 'text-blue-800'; break;
                    case 'noon': bgColor = 'bg-yellow-200'; textColor = 'text-yellow-800'; break;
                    case 'afternoon': bgColor = 'bg-green-200'; textColor = 'text-green-800'; break;
                    case 'evening': bgColor = 'bg-purple-200'; textColor = 'text-purple-800'; break;
                    default: bgColor = 'bg-red-200'; textColor = 'text-red-800';
                }

                return (
                    <div className="p-1">
                        <button
                            className={`w-full ${bgColor} ${textColor} py-1 px-2 rounded hover:opacity-80 transition-colors`}
                            onClick={(e) => openShiftModal(employeeId, day, null, true, e)}
                        >
                            {SHIFT_LABELS[currentShift]}
                        </button>
                    </div>
                );
            }
        }

        // Nếu không phải Live và không được phép sửa
        if (!isEditable) {
            const hasShifts = dayShifts.morning || dayShifts.noon || dayShifts.afternoon || dayShifts.evening;
            if (!hasShifts) return <div className="h-10 flex items-center justify-center text-gray-400">-</div>;

            return (
                <div className="p-1 flex flex-col gap-1">
                    {dayShifts.morning && <div className="bg-blue-200 text-blue-800 rounded-md py-1 px-2 text-center text-xs font-medium">Sáng</div>}
                    {dayShifts.noon && <div className="bg-yellow-200 text-yellow-800 rounded-md py-1 px-2 text-center text-xs font-medium">Trưa</div>}
                    {dayShifts.afternoon && <div className="bg-green-200 text-green-800 rounded-md py-1 px-2 text-center text-xs font-medium">Chiều</div>}
                    {dayShifts.evening && <div className="bg-purple-200 text-purple-800 rounded-md py-1 px-2 text-center text-xs font-medium">Tối</div>}
                </div>
            );
        }



        // Hiển thị các ca đã đăng ký hoặc nút thêm ca
        const hasShifts = dayShifts.morning || dayShifts.noon || dayShifts.afternoon || dayShifts.evening;

        if (!hasShifts) {
            return (
                <div className="p-1">
                    <button
                        className="w-full bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
                        onClick={(e) => openShiftModal(employeeId, day, dayShifts, false, e)}
                    >
                        <Plus size={14} className="mr-1" /> Thêm ca
                    </button>
                </div>
            );
        }

        return (
            <div className="p-1 flex flex-col gap-1">
                {dayShifts.morning && (
                    <div className="bg-blue-200 text-blue-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                        <span>Sáng</span>
                        <button
                            onClick={() => handleShiftToggle(employeeId, day, 'morning')}
                            className="text-blue-700 hover:text-blue-900 focus:outline-none"
                        >
                            ×
                        </button>
                    </div>
                )}

                {dayShifts.noon && (
                    <div className="bg-yellow-200 text-yellow-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                        <span>Trưa</span>
                        <button
                            onClick={() => handleShiftToggle(employeeId, day, 'noon')}
                            className="text-yellow-700 hover:text-yellow-900 focus:outline-none"
                        >
                            ×
                        </button>
                    </div>
                )}

                {dayShifts.afternoon && (
                    <div className="bg-green-200 text-green-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                        <span>Chiều</span>
                        <button
                            onClick={() => handleShiftToggle(employeeId, day, 'afternoon')}
                            className="text-green-700 hover:text-green-900 focus:outline-none"
                        >
                            ×
                        </button>
                    </div>
                )}

                {dayShifts.evening && (
                    <div className="bg-purple-200 text-purple-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                        <span>Tối</span>
                        <button
                            onClick={() => handleShiftToggle(employeeId, day, 'evening')}
                            className="text-purple-700 hover:text-purple-900 focus:outline-none"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Nút thêm ca nếu chưa đăng ký đủ 4 ca */}
                {(!dayShifts.morning || !dayShifts.noon || !dayShifts.afternoon || !dayShifts.evening) && (
                    <button
                        className="bg-gray-100 text-gray-600 py-1 px-2 rounded hover:bg-gray-200 transition-colors text-xs flex items-center justify-center"
                        onClick={(e) => openShiftModal(employeeId, day, dayShifts, false, e)}
                    >
                        <Plus size={12} className="mr-1" /> Thêm ca
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4 max-w-full">
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
                            {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM', { locale: vi })} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yyyy', { locale: vi })}
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
                        ? 'Với quyền quản trị viên, bạn có thể chỉnh sửa lịch Live và đăng ký ca cho tất cả nhân viên.'
                        : 'Bạn chỉ có thể đăng ký ca làm việc cho chính mình.'}
                </p>
            </div>

            {/* Bảng đăng ký ca làm việc */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300" style={{ width: '25%' }}>
                                NHÂN VIÊN
                            </th>
                            {DAY_NAMES.map((day, index) => (
                                <th key={index} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300" style={{ width: '10%' }}>
                                    {day}
                                </th>
                            ))}
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                                TỔNG BUỔI
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Danh sách nhân viên */}
                        {employees.map((employee) => (
                            <tr key={employee.userId} className={employee.userId === userId ? "bg-blue-100" : ""}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                                    {employee.username} {employee.userId === userId && " (Bạn)"}
                                </td>

                                {/* Các ngày trong tuần */}
                                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                    <td key={day} className="p-1 border border-gray-300">
                                        {renderShiftCell(employee.userId, day, employee.shifts[day])}
                                    </td>
                                ))}

                                {/* Tổng số buổi */}
                                <td className="px-3 py-2 whitespace-nowrap text-center text-sm font-medium text-gray-800 border border-gray-300">
                                    {calculateTotalShifts(employee.shifts)}
                                </td>
                            </tr>
                        ))}

                        {/* Hàng Live */}
                        <tr className="bg-red-100">
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-red-800 border border-gray-300">
                                Lịch Live
                            </td>

                            {/* Các ngày trong tuần */}
                            {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                <td key={day} className="whitespace-nowrap border border-gray-300">
                                    {renderShiftCell('live', day, {
                                        morning: liveEvents[day] === 'morning',
                                        noon: liveEvents[day] === 'noon',
                                        afternoon: liveEvents[day] === 'afternoon',
                                        evening: liveEvents[day] === 'evening'
                                    })}
                                </td>
                            ))}

                            {/* Tổng số buổi */}
                            <td className="px-3 py-2 whitespace-nowrap text-center text-sm font-medium text-gray-800 border border-gray-300">
                                {Object.values(liveEvents).filter(shift => shift !== 'off').length}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Modal chọn ca làm việc */}
            {modalInfo.isOpen && (
                <div className="fixed inset-0 z-50 overflow-auto flex" onClick={closeModal}>
                    <div
                        className="relative bg-white rounded-lg shadow-xl p-4 max-w-md border border-gray-300"
                        style={{
                            position: 'absolute',
                            top: `${modalInfo.position.y}px`,
                            left: `${modalInfo.position.x}px`,
                            transform: modalInfo.isLive ? 'translate(-50%, -110%)' : 'translate(-50%, 10px)',
                            minWidth: '280px',
                            maxWidth: '90%',
                            zIndex: 9999
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">
                                {modalInfo.isLive ? 'Chọn giờ Live' : 'Đăng ký ca làm việc'}
                            </h3>
                            <button
                                className="text-gray-500 hover:text-gray-700"
                                onClick={closeModal}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {modalInfo.isLive ? (
                            <div className="space-y-2">
                                {Object.entries(SHIFT_LABELS).map(([value, label]) => {
                                    const currentShift = liveEvents[modalInfo.day];
                                    return (
                                        <div
                                            key={value}
                                            className={`p-3 cursor-pointer hover:bg-gray-100 rounded-md flex items-center ${value === currentShift ? 'bg-blue-50 border border-blue-200' : ''}`}
                                            onClick={() => {
                                                handleShiftToggle('live', modalInfo.day, value as ShiftType);
                                                closeModal();
                                            }}
                                        >
                                            <div className="flex-1">{label}</div>
                                            {value === currentShift && (
                                                <div className="text-blue-600">✓</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {modalInfo.dayShifts && (
                                    <>
                                        <div
                                            className={`p-3 cursor-pointer hover:bg-blue-100 rounded-md flex items-center ${modalInfo.dayShifts.morning ? 'bg-blue-50 border border-blue-200' : ''}`}
                                            onClick={() => {
                                                handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'morning');
                                                // Không đóng modal để người dùng có thể chọn nhiều ca
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={modalInfo.dayShifts.morning || false}
                                                readOnly
                                                className="mr-2"
                                            />
                                            <div className="flex-1">Sáng (06:00 - 12:00)</div>
                                            {modalInfo.dayShifts.morning && (
                                                <div className="text-blue-600">✓</div>
                                            )}
                                        </div>

                                        <div
                                            className={`p-3 cursor-pointer hover:bg-yellow-100 rounded-md flex items-center ${modalInfo.dayShifts.noon ? 'bg-yellow-50 border border-yellow-200' : ''}`}
                                            onClick={() => {
                                                handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'noon');
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={modalInfo.dayShifts.noon || false}
                                                readOnly
                                                className="mr-2"
                                            />
                                            <div className="flex-1">Trưa (12:00 - 14:00)</div>
                                            {modalInfo.dayShifts.noon && (
                                                <div className="text-yellow-600">✓</div>
                                            )}
                                        </div>

                                        <div
                                            className={`p-3 cursor-pointer hover:bg-green-100 rounded-md flex items-center ${modalInfo.dayShifts.afternoon ? 'bg-green-50 border border-green-200' : ''}`}
                                            onClick={() => {
                                                handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'afternoon');
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={modalInfo.dayShifts.afternoon || false}
                                                readOnly
                                                className="mr-2"
                                            />
                                            <div className="flex-1">Chiều (14:00 - 18:00)</div>
                                            {modalInfo.dayShifts.afternoon && (
                                                <div className="text-green-600">✓</div>
                                            )}
                                        </div>

                                        <div
                                            className={`p-3 cursor-pointer hover:bg-purple-100 rounded-md flex items-center ${modalInfo.dayShifts.evening ? 'bg-purple-50 border border-purple-200' : ''}`}
                                            onClick={() => {
                                                handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'evening');
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={modalInfo.dayShifts.evening || false}
                                                readOnly
                                                className="mr-2"
                                            />
                                            <div className="flex-1">Tối (18:00 - 22:00)</div>
                                            {modalInfo.dayShifts.evening && (
                                                <div className="text-purple-600">✓</div>
                                            )}
                                        </div>
                                    </>
                                )}

                                <div className="flex justify-end mt-4">
                                    <button
                                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                        onClick={closeModal}
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Phần chú thích đã được bỏ theo yêu cầu */}
        </div>
    );
};

export default ShiftTable;
