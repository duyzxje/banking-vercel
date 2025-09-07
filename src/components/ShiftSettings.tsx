'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Save, RefreshCw, Info } from 'lucide-react';

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

interface SettingsResponse {
    success: boolean;
    data?: {
        shiftRegistration: ShiftRegistrationSettings;
    };
    message?: string;
}

interface ShiftSettingsProps {
    isAdmin: boolean;
}

const defaultSettings: ShiftRegistrationSettings = {
    enabled: true,
    windowStartOffsetDays: -3,
    windowEndOffsetDays: -2,
    startTime: { hour: 0, minute: 0 },
    endTime: { hour: 23, minute: 59 }
};

const ShiftSettings: React.FC<ShiftSettingsProps> = ({ isAdmin }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<ShiftRegistrationSettings>(defaultSettings);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('https://worktime-dux3.onrender.com/api/settings', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data: SettingsResponse = await response.json();
                if (data.success && data.data?.shiftRegistration) {
                    setSettings(data.data.shiftRegistration);
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) loadSettings();
    }, [isAdmin]);

    const handleSave = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('https://worktime-dux3.onrender.com/api/settings/shift-registration', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            const data = await response.json();
            if (response.ok && data.success) {
                alert('Cập nhật cấu hình đăng ký ca thành công!');
            } else {
                alert(data.message || 'Không thể cập nhật cấu hình.');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Có lỗi xảy ra khi lưu cấu hình.');
        } finally {
            setSaving(false);
        }
    };

    const handleNumberChange = (key: keyof ShiftRegistrationSettings, value: number) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleTimeChange = (which: 'startTime' | 'endTime', field: keyof TimeOfDay, value: number) => {
        setSettings(prev => ({ ...prev, [which]: { ...prev[which], [field]: value } }));
    };

    if (!isAdmin) {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center">
                <p className="text-red-600">Bạn không có quyền truy cập mục này!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-1 flex items-center">
                            <Settings className="h-5 w-5 mr-2 text-purple-600" />
                            Cấu hình đăng ký ca
                        </h2>
                        <p className="text-sm text-gray-600">Bật/tắt và điều chỉnh khung thời gian cho phép nhân viên đăng ký ca làm</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={loadSettings} disabled={loading} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-md transition-colors flex items-center gap-2">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Tải lại
                        </button>
                        <button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            Lưu
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={settings.enabled}
                                onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                className="h-4 w-4"
                            />
                            <span className="text-gray-800 font-medium">Bật giới hạn thời gian đăng ký</span>
                        </label>
                        <div className="flex items-center text-xs text-gray-500 gap-1">
                            <Info className="h-3 w-3" />
                            Admin không bị giới hạn
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-800">Khoảng ngày cho phép (so với Thứ 2 của tuần đăng ký)</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Bắt đầu (offset ngày)</label>
                                    <input
                                        type="number"
                                        value={settings.windowStartOffsetDays}
                                        onChange={(e) => handleNumberChange('windowStartOffsetDays', Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        step={1}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Ví dụ: -3 = Thứ 6 tuần trước</p>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Kết thúc (offset ngày)</label>
                                    <input
                                        type="number"
                                        value={settings.windowEndOffsetDays}
                                        onChange={(e) => handleNumberChange('windowEndOffsetDays', Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        step={1}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Ví dụ: -2 = Thứ 7 tuần trước</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-800">Khung giờ trong ngày</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Giờ bắt đầu</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={0}
                                            max={23}
                                            value={settings.startTime.hour}
                                            onChange={(e) => handleTimeChange('startTime', 'hour', Number(e.target.value))}
                                            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <span className="text-gray-500">:</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={59}
                                            value={settings.startTime.minute}
                                            onChange={(e) => handleTimeChange('startTime', 'minute', Number(e.target.value))}
                                            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Giờ kết thúc</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={0}
                                            max={23}
                                            value={settings.endTime.hour}
                                            onChange={(e) => handleTimeChange('endTime', 'hour', Number(e.target.value))}
                                            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <span className="text-gray-500">:</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={59}
                                            value={settings.endTime.minute}
                                            onChange={(e) => handleTimeChange('endTime', 'minute', Number(e.target.value))}
                                            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">Mặc định: 00:00 → 23:59</p>
                        </div>
                    </div>

                    <div className="bg-purple-50 text-purple-800 rounded-md p-3 text-xs">
                        Khi bật giới hạn thời gian, nhân viên chỉ có thể đăng ký ca trong khoảng thời gian được cấu hình liên quan đến tuần đăng ký (Thứ 2 là ngày bắt đầu tuần). Admin không bị giới hạn.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShiftSettings;


