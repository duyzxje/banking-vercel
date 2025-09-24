'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Calendar, Clock, DollarSign, RefreshCw, Settings, Users, BarChart3 } from 'lucide-react';
import EmployeeManagement from '@/components/EmployeeManagement';
import AttendanceManagement from '@/components/AttendanceManagement';
import SalaryManagement from '@/components/SalaryManagement';
import ShiftSettings from '@/components/ShiftSettings';
import PushNotificationSettings from '@/components/PushNotificationSettings';
import usePushNotifications from '@/components/usePushNotifications';

export default function AdminView() {
    const [adminSubTab, setAdminSubTab] = useState<'overview' | 'employees' | 'attendance' | 'salary' | 'shiftSettings' | 'pushSettings'>('overview');
    const [overviewLoading, setOverviewLoading] = useState<boolean>(false);
    const [totalEmployees, setTotalEmployees] = useState<number>(0);
    const [currentlyWorking, setCurrentlyWorking] = useState<number>(0);
    const [currentlyWorkingDetails, setCurrentlyWorkingDetails] = useState<Array<{ userId: string; name: string; checkInTime: string; checkInTimeFormatted: string }>>([]);

    const { isInitialized: pushInitialized, isSubscribed: pushSubscribed, permission: pushPermission, isSupported: pushSupported } = usePushNotifications();

    const loadAdminOverviewStats = useCallback(async () => {
        try {
            setOverviewLoading(true);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) return;
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } as const;
            const totalResponse = await fetch('https://worktime-dux3.onrender.com/api/users/count', { headers });
            if (totalResponse.ok) {
                const totalData = await totalResponse.json();
                if (totalData.success) setTotalEmployees(totalData.data.totalEmployees);
            }
            const workingResponse = await fetch('https://worktime-dux3.onrender.com/api/users/currently-working', { headers });
            if (workingResponse.ok) {
                const workingData = await workingResponse.json();
                if (workingData.success) {
                    setCurrentlyWorking(workingData.data.count);
                    if (workingData.data.currentlyWorking?.length > 0) {
                        setCurrentlyWorkingDetails(workingData.data.currentlyWorking.map((emp: { userId: string; name: string; checkInTime: string; checkInTimeFormatted: string }) => ({
                            userId: emp.userId,
                            name: emp.name,
                            checkInTime: emp.checkInTime,
                            checkInTimeFormatted: emp.checkInTimeFormatted,
                        })));
                    } else {
                        setCurrentlyWorkingDetails([]);
                    }
                }
            }
        } catch (e) {
            console.error('Error loading admin overview stats:', e);
        } finally {
            setOverviewLoading(false);
        }
    }, []);

    useEffect(() => { loadAdminOverviewStats(); }, [loadAdminOverviewStats]);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <Settings className="h-6 w-6 mr-3 text-red-600" />
                    Quản lý hệ thống
                </h2>
                <p className="text-gray-600">Chào mừng Admin! Chọn chức năng quản lý để tiếp tục</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        <button
                            onClick={() => setAdminSubTab('overview')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'overview'
                                ? 'border-red-500 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            title="Tổng quan"
                        >
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 sm:hidden" />
                                <span className="hidden sm:inline">Tổng quan</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setAdminSubTab('employees')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'employees'
                                ? 'border-red-500 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            title="Quản lý nhân viên"
                        >
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 sm:hidden" />
                                <span className="hidden sm:inline">Quản lý nhân viên</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setAdminSubTab('attendance')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'attendance'
                                ? 'border-red-500 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            title="Quản lý chấm công"
                        >
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 sm:hidden" />
                                <span className="hidden sm:inline">Quản lý chấm công</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setAdminSubTab('salary')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'salary'
                                ? 'border-red-500 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            title="Quản lý lương"
                        >
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 sm:hidden" />
                                <span className="hidden sm:inline">Quản lý lương</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setAdminSubTab('shiftSettings')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'shiftSettings'
                                ? 'border-red-500 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            title="Cấu hình đăng ký ca"
                        >
                            <div className="flex items-center gap-2">
                                <Settings className="h-4 w-4 sm:hidden" />
                                <span className="hidden sm:inline">Cấu hình ca</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setAdminSubTab('pushSettings')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'pushSettings'
                                ? 'border-red-500 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            title="Cài đặt thông báo Push"
                        >
                            <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 sm:hidden" />
                                <span className="hidden sm:inline">Push AppNotifications</span>
                            </div>
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {adminSubTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-800">Thống kê tổng quan</h3>
                                <button
                                    onClick={loadAdminOverviewStats}
                                    disabled={overviewLoading}
                                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                                >
                                    <RefreshCw className={`h-4 w-4 ${overviewLoading ? 'animate-spin' : ''}`} />
                                    {overviewLoading ? 'Đang tải...' : 'Làm mới'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 rounded-lg p-6">
                                    <div className="flex items-center">
                                        <Users className="h-8 w-8 text-blue-600 mr-3" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Tổng nhân viên</p>
                                            {overviewLoading ? (
                                                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                                            ) : (
                                                <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-6">
                                    <div className="flex items-center mb-4">
                                        <Clock className="h-8 w-8 text-green-600 mr-3" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Đang làm việc</p>
                                            {overviewLoading ? (
                                                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                                            ) : (
                                                <p className="text-2xl font-bold text-gray-900">{currentlyWorking}</p>
                                            )}
                                        </div>
                                    </div>

                                    {!overviewLoading && currentlyWorkingDetails.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-gray-500 mb-2">Chi tiết:</p>
                                            {currentlyWorkingDetails.map((employee, index) => (
                                                <div key={employee.userId} className="bg-white rounded-lg p-3 border border-gray-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                                                <span className="text-xs font-medium text-green-600">{index + 1}</span>
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500">Check-in:</p>
                                                            <p className="text-sm font-medium text-green-600">
                                                                {employee.checkInTimeFormatted || (employee.checkInTime ? new Date(employee.checkInTime).toTimeString().slice(0, 5) : '--:--')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!overviewLoading && currentlyWorkingDetails.length === 0 && currentlyWorking === 0 && (
                                        <div className="text-center py-2">
                                            <p className="text-xs text-gray-400">Không có nhân viên nào đang làm việc</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 rounded-lg p-6">
                                    <div className="flex items-center mb-4">
                                        <Users className="h-8 w-8 text-blue-600 mr-3" />
                                        <h3 className="text-lg font-semibold text-gray-800">Quản lý nhân viên</h3>
                                    </div>
                                    <p className="text-gray-600 mb-4">Quản lý thông tin, quyền hạn và trạng thái của nhân viên trong hệ thống</p>
                                    <button onClick={() => setAdminSubTab('employees')} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium">Xem danh sách nhân viên</button>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-6">
                                    <div className="flex items-center mb-4">
                                        <Clock className="h-8 w-8 text-green-600 mr-3" />
                                        <h3 className="text-lg font-semibold text-gray-800">Quản lý chấm công</h3>
                                    </div>
                                    <p className="text-gray-600 mb-4">Theo dõi và quản lý lịch sử chấm công của tất cả nhân viên</p>
                                    <button onClick={() => setAdminSubTab('attendance')} className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium">Xem báo cáo chấm công</button>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-6">
                                    <div className="flex items-center mb-4">
                                        <DollarSign className="h-8 w-8 text-yellow-600 mr-3" />
                                        <h3 className="text-lg font-semibold text-gray-800">Quản lý lương</h3>
                                    </div>
                                    <p className="text-gray-600 mb-4">Tính lương và quản lý mức lương theo giờ của nhân viên</p>
                                    <button onClick={() => setAdminSubTab('salary')} className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium">Xem báo cáo lương</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {adminSubTab === 'employees' && (
                        <EmployeeManagement isAdmin={true} />
                    )}

                    {adminSubTab === 'attendance' && (
                        <AttendanceManagement isAdmin={true} />
                    )}

                    {adminSubTab === 'salary' && (
                        <SalaryManagement isAdmin={true} />
                    )}

                    {adminSubTab === 'shiftSettings' && (
                        <ShiftSettings isAdmin={true} />
                    )}

                    {adminSubTab === 'pushSettings' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Cài đặt Push AppNotifications</h3>
                                <PushNotificationSettings />
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Trạng thái Push AppNotifications</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700 font-medium">Hỗ trợ trình duyệt</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${pushSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{pushSupported ? 'Được hỗ trợ' : 'Không hỗ trợ'}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700 font-medium">Khởi tạo</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${pushInitialized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{pushInitialized ? 'Đã khởi tạo' : 'Đang khởi tạo...'}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700 font-medium">Quyền thông báo</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${pushPermission === 'granted' ? 'bg-green-100 text-green-800' : (pushPermission === 'denied' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}`}>{pushPermission === 'granted' ? 'Đã cấp quyền' : pushPermission === 'denied' ? 'Bị từ chối' : 'Chưa cấp quyền'}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700 font-medium">Đăng ký Push</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${pushSubscribed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{pushSubscribed ? 'Đã đăng ký' : 'Chưa đăng ký'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


