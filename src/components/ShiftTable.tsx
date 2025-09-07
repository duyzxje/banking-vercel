'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Calendar, Plus, X } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays } from 'date-fns';
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

// Cấu hình giới hạn đăng ký ca (đồng bộ với ShiftSettings)
interface TimeOfDay {
    hour: number;
    minute: number;
}

interface ShiftRegistrationSettings {
    enabled: boolean;
    windowStartOffsetDays: number;
    windowEndOffsetDays: number;
    startTime: TimeOfDay;
    endTime: TimeOfDay;
}

interface PublicShiftRegistrationSettings extends ShiftRegistrationSettings {
    nextWeekStartDate: string; // YYYY-MM-DD (Monday of next week)
    windowStartAt: string; // ISO datetime when window opens
    windowEndAt: string;   // ISO datetime when window closes
}

interface SettingsResponse {
    success: boolean;
    data?: {
        enabled: boolean;
        windowStartOffsetDays: number;
        windowEndOffsetDays: number;
        startTime: TimeOfDay;
        endTime: TimeOfDay;
        nextWeekStartDate: string;
        windowStartAt: string;
        windowEndAt: string;
    };
}

const defaultSettings: PublicShiftRegistrationSettings = {
    enabled: true,
    windowStartOffsetDays: -3,
    windowEndOffsetDays: -2,
    startTime: { hour: 0, minute: 0 },
    endTime: { hour: 23, minute: 59 },
    nextWeekStartDate: '',
    windowStartAt: '',
    windowEndAt: ''
};

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
    const [liveEvents, setLiveEvents] = useState<Record<number, ShiftType[]>>({});
    const [settings, setSettings] = useState<PublicShiftRegistrationSettings>(defaultSettings);
    const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
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
                    // API đã trả về cấu trúc mới (array of shifts), sử dụng trực tiếp
                    const schedule = liveData.data.schedule || {};
                    console.log('Live schedule from API:', schedule);
                    setLiveEvents(schedule);
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

    // Tải cấu hình giới hạn đăng ký ca
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                const res = await fetch('https://worktime-dux3.onrender.com/api/settings/public/shift-registration', { headers, cache: 'no-store' });
                if (res.ok) {
                    const data: SettingsResponse = await res.json();
                    if (data.success && data.data) {
                        setSettings(data.data as PublicShiftRegistrationSettings);
                    }
                }
            } catch {
                console.warn('Không thể tải cấu hình đăng ký ca. Dùng mặc định.');
            } finally {
                setSettingsLoaded(true);
            }
        };
        loadSettings();
    }, []);

    // Helper xác định quyền chỉnh sửa theo cửa sổ đăng ký cho tuần xem là tuần sau
    const getWeekStart = (date: Date): Date => startOfWeek(date, { weekStartsOn: 1 });
    // const getNextWeekStart = (date: Date): Date => addWeeks(getWeekStart(date), 1);
    const sameYMD = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    // const atTime = (base: Date, t: TimeOfDay) => {
    //     const d = new Date(base);
    //     d.setHours(t.hour, t.minute, 0, 0);
    //     return d;
    // };
    const withinWindow = (): boolean => {
        if (!settings.enabled) return true;
        if (!settings.windowStartAt || !settings.windowEndAt) return false;
        const start = new Date(settings.windowStartAt);
        const end = new Date(settings.windowEndAt);
        const now = new Date();
        return now >= start && now <= end;
    };
    const isEditableForView = (): boolean => {
        if (isAdmin) return true; // admin không bị giới hạn
        if (!settingsLoaded) return false; // chờ cấu hình
        const viewedWeekStart = getWeekStart(currentDate);
        // server xác định Monday tuần sau
        if (!settings.nextWeekStartDate) return false;
        const serverNextWeekStart = new Date(settings.nextWeekStartDate + 'T00:00:00');
        if (!sameYMD(viewedWeekStart, serverNextWeekStart)) return false; // Chỉ cho tuần sau theo server
        return withinWindow();
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
                    const currentShifts = liveEvents[day] || [];
                    const isAdding = !currentShifts.includes(shiftType);
                    const action = isAdding ? 'add' : 'remove';

                    const response = await fetch('https://worktime-dux3.onrender.com/api/live/update', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            day,
                            shiftType,
                            weekStartDate: formatDateForAPI(startOfWeek(currentDate, { weekStartsOn: 1 })),
                            action
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            // Cập nhật state từ response của backend (đã có đầy đủ schedule)
                            setLiveEvents(data.data.schedule);

                            // Kiểm tra nếu không còn ca nào, gọi API DELETE để xóa lịch Live của ngày đó
                            if (!data.data.schedule[day] || data.data.schedule[day].length === 0) {
                                try {
                                    const deleteResponse = await fetch(
                                        `https://worktime-dux3.onrender.com/api/live/${day}?weekStartDate=${formatDateForAPI(startOfWeek(currentDate, { weekStartsOn: 1 }))}`,
                                        {
                                            method: 'DELETE',
                                            headers
                                        }
                                    );

                                    if (deleteResponse.ok) {
                                        console.log(`Đã xóa lịch Live cho ngày ${day}`);
                                    }
                                } catch (deleteError) {
                                    console.error('Lỗi khi xóa lịch Live:', deleteError);
                                }
                            }

                            // Hiển thị thông báo thành công
                            const dayName = DAY_NAMES[day - 1];
                            const shiftName = SHIFT_LABELS[shiftType];
                            const actionText = isAdding ? 'thêm' : 'xóa';
                            setMessage(`Đã ${actionText} buổi Live ${dayName} - ${shiftName}`);
                            setMessageType('success');
                        } else {
                            throw new Error(data.error?.message || 'Có lỗi xảy ra');
                        }
                    } else {
                        throw new Error('Không thể cập nhật lịch Live');
                    }
                } else {
                    // Cập nhật ca làm việc của nhân viên (bao gồm cả ca Off)
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

                            // Cập nhật modalInfo để hiển thị thay đổi ngay lập tức
                            setModalInfo(prev => ({
                                ...prev,
                                dayShifts: data.data.shifts[day]
                            }));

                            // Kiểm tra nếu không còn ca nào, gọi API DELETE để xóa ca của ngày đó
                            if (!data.data.shifts[day] ||
                                (!data.data.shifts[day].morning &&
                                    !data.data.shifts[day].noon &&
                                    !data.data.shifts[day].afternoon &&
                                    !data.data.shifts[day].evening &&
                                    !data.data.shifts[day].off)) {

                                try {
                                    // Phân biệt API DELETE cho admin và user thường
                                    const deleteUrl = isAdmin
                                        ? `https://worktime-dux3.onrender.com/api/shifts/user/${empUserId}/day/${day}?weekStartDate=${formatDateForAPI(startOfWeek(currentDate, { weekStartsOn: 1 }))}`
                                        : `https://worktime-dux3.onrender.com/api/shifts/own/${day}?weekStartDate=${formatDateForAPI(startOfWeek(currentDate, { weekStartsOn: 1 }))}`;

                                    const deleteResponse = await fetch(deleteUrl, {
                                        method: 'DELETE',
                                        headers
                                    });

                                    if (deleteResponse.ok) {
                                        if (isAdmin) {
                                            console.log(`Admin đã xóa ca của user ${empUserId} cho ngày ${day}`);
                                        } else {
                                            console.log(`User đã xóa ca của chính mình cho ngày ${day}`);
                                        }
                                    }
                                } catch (deleteError) {
                                    console.error('Lỗi khi xóa ca:', deleteError);
                                }
                            }

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
        const modalHeight = 400; // Ước tính chiều cao modal
        const modalWidth = 320; // Ước tính chiều rộng modal

        // Tính toán vị trí X (hiển thị bên trái nút)
        let x = rect.left + window.scrollX - modalWidth - 10; // Bên trái nút với khoảng cách 10px

        // Tính toán vị trí Y (căn giữa theo nút)
        let y = rect.top + (rect.height / 2) + window.scrollY - (modalHeight / 2);

        // Kiểm tra nếu modal bị tràn ra ngoài màn hình bên trái, thì hiển thị bên phải
        if (x < 20) {
            x = rect.right + window.scrollX + 10; // Bên phải nút với khoảng cách 10px
        }

        // Kiểm tra nếu modal bị tràn ra ngoài màn hình bên phải
        if (x + modalWidth > window.innerWidth - 20) {
            x = window.innerWidth - modalWidth - 20;
        }

        // Kiểm tra nếu modal bị tràn ra ngoài màn hình bên trên
        if (y < 20) {
            y = 20;
        }

        // Kiểm tra nếu modal bị tràn ra ngoài màn hình bên dưới
        if (y + modalHeight > window.innerHeight - 20) {
            y = window.innerHeight - modalHeight - 20;
        }

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
        const baseEditable = (employeeId === userId && !isAdmin) || isAdmin;
        const isEditable = baseEditable && isEditableForView();
        const isLiveRow = employeeId === 'live';

        // Nếu là hàng Live
        if (isLiveRow) {
            const currentShifts = liveEvents[day] || [];
            const hasShifts = currentShifts.length > 0;

            if (!hasShifts) {
                return (
                    <div className="p-1">
                        {isAdmin ? (
                            <button
                                className="w-full bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
                                onClick={(e) => openShiftModal(employeeId, day, null, true, e)}
                            >
                                <Plus size={14} className="mr-1" /> Thêm ca
                            </button>
                        ) : (
                            <div className="h-10 flex items-center justify-center text-gray-400">-</div>
                        )}
                    </div>
                );
            }

            return (
                <div className="p-1 flex flex-col gap-1">
                    {currentShifts.includes('off') && (
                        <div className="bg-red-200 text-red-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                            <span>Off</span>
                            {isAdmin && (
                                <button
                                    onClick={() => handleShiftToggle('live', day, 'off')}
                                    className="text-red-700 hover:text-red-900 focus:outline-none"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    {currentShifts.includes('morning') && (
                        <div className="bg-blue-200 text-blue-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                            <span>Sáng</span>
                            {isAdmin && (
                                <button
                                    onClick={() => handleShiftToggle('live', day, 'morning')}
                                    className="text-blue-700 hover:text-blue-900 focus:outline-none"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    {currentShifts.includes('noon') && (
                        <div className="bg-yellow-200 text-yellow-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                            <span>Trưa</span>
                            {isAdmin && (
                                <button
                                    onClick={() => handleShiftToggle('live', day, 'noon')}
                                    className="text-yellow-700 hover:text-yellow-900 focus:outline-none"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    {currentShifts.includes('afternoon') && (
                        <div className="bg-green-200 text-green-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                            <span>Chiều</span>
                            {isAdmin && (
                                <button
                                    onClick={() => handleShiftToggle('live', day, 'afternoon')}
                                    className="text-green-700 hover:text-green-900 focus:outline-none"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    {currentShifts.includes('evening') && (
                        <div className="bg-purple-200 text-purple-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                            <span>Tối</span>
                            {isAdmin && (
                                <button
                                    onClick={() => handleShiftToggle('live', day, 'evening')}
                                    className="text-purple-700 hover:text-purple-900 focus:outline-none"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    {/* Nút thay đổi ca chỉ hiển thị cho admin */}
                    {isAdmin && (
                        <button
                            className="bg-blue-100 text-blue-600 py-1 px-2 rounded hover:bg-blue-200 transition-colors text-xs flex items-center justify-center"
                            onClick={(e) => openShiftModal(employeeId, day, null, true, e)}
                        >
                            <CalendarClock size={12} className="mr-1" /> Thay đổi
                        </button>
                    )}
                </div>
            );
        }

        // Nếu không phải Live và không được phép sửa
        if (!isEditable) {
            const hasShifts = dayShifts.morning || dayShifts.noon || dayShifts.afternoon || dayShifts.evening || dayShifts.off;
            if (!hasShifts) return <div className="h-10 flex items-center justify-center text-gray-400">-</div>;

            return (
                <div className="p-1 flex flex-col gap-1">
                    {dayShifts.morning && <div className="bg-blue-200 text-blue-800 rounded-md py-1 px-2 text-center text-xs font-medium">Sáng</div>}
                    {dayShifts.noon && <div className="bg-yellow-200 text-yellow-800 rounded-md py-1 px-2 text-center text-xs font-medium">Trưa</div>}
                    {dayShifts.afternoon && <div className="bg-green-200 text-green-800 rounded-md py-1 px-2 text-center text-xs font-medium">Chiều</div>}
                    {dayShifts.evening && <div className="bg-purple-200 text-purple-800 rounded-md py-1 px-2 text-center text-xs font-medium">Tối</div>}
                    {dayShifts.off && <div className="bg-red-200 text-red-800 rounded-md py-1 px-2 text-center text-xs font-medium">Off</div>}
                </div>
            );
        }



        // Hiển thị các ca đã đăng ký hoặc nút thêm ca (bao gồm cả ca Off)
        const hasShifts = dayShifts.morning || dayShifts.noon || dayShifts.afternoon || dayShifts.evening || dayShifts.off;

        if (!hasShifts) {
            return (
                <div className="p-1">
                    <button
                        className={`w-full ${isEditable ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'} py-1 px-2 rounded transition-colors flex items-center justify-center`}
                        onClick={(e) => { if (isEditable) openShiftModal(employeeId, day, dayShifts, false, e); }}
                        disabled={!isEditable}
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
                            onClick={() => { if (isEditable) handleShiftToggle(employeeId, day, 'morning'); }}
                            className={`focus:outline-none ${isEditable ? 'text-blue-700 hover:text-blue-900' : 'text-gray-400 cursor-not-allowed'}`}
                            disabled={!isEditable}
                        >
                            ×
                        </button>
                    </div>
                )}

                {dayShifts.noon && (
                    <div className="bg-yellow-200 text-yellow-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                        <span>Trưa</span>
                        <button
                            onClick={() => { if (isEditable) handleShiftToggle(employeeId, day, 'noon'); }}
                            className={`focus:outline-none ${isEditable ? 'text-yellow-700 hover:text-yellow-900' : 'text-gray-400 cursor-not-allowed'}`}
                            disabled={!isEditable}
                        >
                            ×
                        </button>
                    </div>
                )}

                {dayShifts.afternoon && (
                    <div className="bg-green-200 text-green-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                        <span>Chiều</span>
                        <button
                            onClick={() => { if (isEditable) handleShiftToggle(employeeId, day, 'afternoon'); }}
                            className={`focus:outline-none ${isEditable ? 'text-green-700 hover:text-green-900' : 'text-gray-400 cursor-not-allowed'}`}
                            disabled={!isEditable}
                        >
                            ×
                        </button>
                    </div>
                )}

                {dayShifts.evening && (
                    <div className="bg-purple-200 text-purple-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                        <span>Tối</span>
                        <button
                            onClick={() => { if (isEditable) handleShiftToggle(employeeId, day, 'evening'); }}
                            className={`focus:outline-none ${isEditable ? 'text-purple-700 hover:text-purple-900' : 'text-gray-400 cursor-not-allowed'}`}
                            disabled={!isEditable}
                        >
                            ×
                        </button>
                    </div>
                )}

                {dayShifts.off && (
                    <div className="bg-red-200 text-red-800 rounded-md py-1 px-2 text-xs font-medium flex justify-between items-center">
                        <span>Off</span>
                        <button
                            onClick={() => { if (isEditable) handleShiftToggle(employeeId, day, 'off'); }}
                            className={`focus:outline-none ${isEditable ? 'text-red-700 hover:text-red-900' : 'text-gray-400 cursor-not-allowed'}`}
                            disabled={!isEditable}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Nút thay đổi ca luôn hiển thị khi có ca để có thể điều chỉnh */}
                <button
                    className={`py-1 px-2 rounded transition-colors text-xs flex items-center justify-center ${isEditable ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    onClick={(e) => { if (isEditable) openShiftModal(employeeId, day, dayShifts, false, e); }}
                    disabled={!isEditable}
                >
                    <CalendarClock size={12} className="mr-1" /> Thay đổi
                </button>
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
                            {DAY_NAMES.map((day, index) => {
                                const dayNumber = index + 1;
                                const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                                const dayDate = new Date(currentWeekStart);
                                dayDate.setDate(currentWeekStart.getDate() + dayNumber - 1);

                                return (
                                    <th key={index} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300" style={{ width: '10%' }}>
                                        <div>{day}</div>
                                        <div className="text-xs font-normal text-gray-400 mt-1">
                                            {format(dayDate, 'dd/MM')}
                                        </div>
                                    </th>
                                );
                            })}

                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Danh sách nhân viên - User hiện tại luôn ở đầu, còn lại sắp xếp theo tên A-Z */}
                        {employees
                            .sort((a, b) => {
                                // Đưa user hiện tại lên đầu
                                if (a.userId === userId) return -1;
                                if (b.userId === userId) return 1;
                                // Sắp xếp các nhân viên khác theo tên từ A-Z
                                return a.name.localeCompare(b.name, 'vi-VN');
                            })
                            .map((employee) => (
                                <tr key={employee.userId} className={employee.userId === userId ? "bg-blue-100" : ""}>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                                        {employee.name} {employee.userId === userId && " (Bạn)"}
                                    </td>

                                    {/* Các ngày trong tuần */}
                                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                        <td key={day} className="p-1 border border-gray-300">
                                            {renderShiftCell(employee.userId, day, employee.shifts[day])}
                                        </td>
                                    ))}


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
                                    {renderShiftCell('live', day, {})}
                                </td>
                            ))}


                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Modal chọn ca làm việc */}
            {modalInfo.isOpen && (
                <div className="fixed inset-0 z-50" onClick={closeModal} style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}>
                    <div
                        className="absolute bg-white rounded-lg shadow-2xl p-4 w-full max-w-xs md:max-w-sm border border-gray-200 relative z-10"
                        style={{
                            // Trên mobile: căn giữa màn hình, trên desktop: theo vị trí ô đã được tính toán
                            top: window.innerWidth < 768 ? '50%' : `${modalInfo.position.y}px`,
                            left: window.innerWidth < 768 ? '50%' : `${modalInfo.position.x}px`,
                            transform: window.innerWidth < 768 ? 'translate(-50%, -50%)' : 'none',
                            zIndex: 9999
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {modalInfo.isLive ? 'Chọn giờ Live' : 'Đăng ký ca làm việc'}
                                </h3>
                                {!modalInfo.isLive && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {DAY_NAMES[modalInfo.day - 1]} - {format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), modalInfo.day - 1), 'dd/MM/yyyy', { locale: vi })}
                                    </p>
                                )}
                            </div>
                            <button
                                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                onClick={closeModal}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {modalInfo.isLive ? (
                            <div className="space-y-2">
                                {/* Hiển thị thứ và ngày tháng cho modal Live */}
                                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        {DAY_NAMES[modalInfo.day - 1]} - {format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), modalInfo.day - 1), 'dd/MM/yyyy', { locale: vi })}
                                    </p>
                                </div>

                                {Object.entries(SHIFT_LABELS).map(([value, label]) => {
                                    const currentShifts = liveEvents[modalInfo.day] || [];
                                    const isSelected = currentShifts.includes(value as ShiftType);
                                    return (
                                        <button
                                            key={value}
                                            className={`w-full p-3 text-left cursor-pointer hover:bg-gray-100 rounded-md flex items-center transition-colors border ${isSelected ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}`}
                                            onClick={() => {
                                                if (value === 'off') {
                                                    // Sau đó toggle ca Off
                                                    handleShiftToggle('live', modalInfo.day, 'off');
                                                    // Khi chọn ca Off, xóa tất cả ca khác trước
                                                    const currentShifts = liveEvents[modalInfo.day] || [];
                                                    currentShifts.forEach(shiftType => {
                                                        if (shiftType !== 'off') {
                                                            handleShiftToggle('live', modalInfo.day, shiftType);
                                                        }
                                                    });
                                                } else {
                                                    // Toggle ca được chọn
                                                    handleShiftToggle('live', modalInfo.day, value as ShiftType);
                                                    // Khi chọn ca khác, xóa ca Off nếu có
                                                    const currentShifts = liveEvents[modalInfo.day] || [];
                                                    if (currentShifts.includes('off')) {
                                                        handleShiftToggle('live', modalInfo.day, 'off');
                                                    }
                                                }
                                            }}
                                        >
                                            <div className="flex-1">{label}</div>
                                            {isSelected && (
                                                <div className="text-blue-600">✓</div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {modalInfo.dayShifts && (
                                    <>
                                        <button
                                            className={`w-full p-3 text-left cursor-pointer hover:bg-blue-100 rounded-md flex items-center transition-colors border ${modalInfo.dayShifts.morning ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}`}
                                            onClick={() => {
                                                handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'morning');
                                                // Không đóng modal để người dùng có thể chọn nhiều ca
                                            }}
                                        >
                                            <div className="flex-1">Sáng</div>
                                            {modalInfo.dayShifts.morning && (
                                                <div className="text-blue-600">✓</div>
                                            )}
                                        </button>

                                        <button
                                            className={`w-full p-3 text-left cursor-pointer hover:bg-yellow-100 rounded-md flex items-center transition-colors border ${modalInfo.dayShifts.noon ? 'bg-yellow-50 border-yellow-200' : 'border-gray-200'}`}
                                            onClick={() => {
                                                handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'noon');
                                            }}
                                        >
                                            <div className="flex-1">Trưa</div>
                                            {modalInfo.dayShifts.noon && (
                                                <div className="text-yellow-600">✓</div>
                                            )}
                                        </button>

                                        <button
                                            className={`w-full p-3 text-left cursor-pointer hover:bg-green-100 rounded-md flex items-center transition-colors border ${modalInfo.dayShifts.afternoon ? 'bg-green-50 border-green-200' : 'border-gray-200'}`}
                                            onClick={() => {
                                                handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'afternoon');
                                            }}
                                        >
                                            <div className="flex-1">Chiều</div>
                                            {modalInfo.dayShifts.afternoon && (
                                                <div className="text-green-600">✓</div>
                                            )}
                                        </button>

                                        <button
                                            className={`w-full p-3 text-left cursor-pointer hover:bg-purple-100 rounded-md flex items-center transition-colors border ${modalInfo.dayShifts.evening ? 'bg-purple-50 border-purple-200' : 'border-gray-200'}`}
                                            onClick={() => {
                                                handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'evening');
                                            }}
                                        >
                                            <div className="flex-1">Tối</div>
                                            {modalInfo.dayShifts.evening && (
                                                <div className="text-purple-600">✓</div>
                                            )}
                                        </button>

                                        {/* Ca Off */}
                                        <button
                                            className={`w-full p-3 text-left cursor-pointer hover:bg-gray-100 rounded-md flex items-center transition-colors border ${modalInfo.dayShifts?.off ? 'bg-gray-50 border-gray-300' : 'border-gray-200'}`}
                                            onClick={() => {
                                                // Toggle ca Off như các ca khác
                                                handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'off');
                                                // Khi chọn ca Off, xóa tất cả ca khác trước
                                                if (modalInfo.dayShifts?.morning) handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'morning');
                                                if (modalInfo.dayShifts?.noon) handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'noon');
                                                if (modalInfo.dayShifts?.afternoon) handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'afternoon');
                                                if (modalInfo.dayShifts?.evening) handleShiftToggle(modalInfo.employeeId, modalInfo.day, 'evening');
                                            }}
                                        >
                                            <div className="flex-1">Off (Nghỉ)</div>
                                            {modalInfo.dayShifts?.off && (
                                                <div className="text-gray-600">✓</div>
                                            )}
                                        </button>
                                    </>
                                )}


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