import React from 'react';
import usePushNotifications from './usePushNotifications';
import { Bell, BellOff, AlertCircle, CheckCircle, X } from 'lucide-react';

const PushNotificationSettings: React.FC = () => {
    const {
        isInitialized,
        isSubscribed,
        permission,
        isLoading,
        error,
        subscribe,
        unsubscribe,
        testPush,
        requestPermission,
        clearError,
        isSupported
    } = usePushNotifications();

    const handleSubscribe = async () => {
        const success = await subscribe();
        if (success) {
            // Show success message
            console.log('Đã đăng ký nhận thông báo push thành công!');
        }
    };

    const handleUnsubscribe = async () => {
        const success = await unsubscribe();
        if (success) {
            // Show success message
            console.log('Đã hủy đăng ký thông báo push!');
        }
    };

    const handleTestPush = async () => {
        const success = await testPush();
        if (success) {
            // Show success message
            console.log('Đã gửi thông báo test!');
        }
    };

    const handleRequestPermission = async () => {
        try {
            await requestPermission();
        } catch (error) {
            console.error('Failed to request permission:', error);
        }
    };

    if (!isSupported) {
        return (
            <div className="push-notification-settings">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Cài đặt thông báo Push</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <p className="text-red-700 font-medium">Thông báo Push không được hỗ trợ</p>
                    </div>
                    <p className="text-red-600 text-sm mt-2">
                        Trình duyệt của bạn không hỗ trợ thông báo push. Vui lòng sử dụng trình duyệt hiện đại hơn.
                    </p>
                </div>
            </div>
        );
    }

    if (!isInitialized) {
        return (
            <div className="push-notification-settings">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Cài đặt thông báo Push</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <p className="text-blue-700">Đang khởi tạo...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="push-notification-settings">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Cài đặt thông báo Push</h3>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                            <div>
                                <p className="text-red-700 font-medium">Lỗi</p>
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        </div>
                        <button
                            onClick={clearError}
                            className="text-red-500 hover:text-red-700"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {/* Permission Status */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            {permission === 'granted' ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : permission === 'denied' ? (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                            )}
                            <span className="text-gray-700 font-medium">Trạng thái quyền</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${permission === 'granted'
                            ? 'bg-green-100 text-green-800'
                            : permission === 'denied'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {permission === 'granted' ? 'Đã cấp quyền' :
                                permission === 'denied' ? 'Bị từ chối' : 'Chưa cấp quyền'}
                        </span>
                    </div>
                </div>

                {/* Subscription Status */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            {isSubscribed ? (
                                <Bell className="h-5 w-5 text-green-500" />
                            ) : (
                                <BellOff className="h-5 w-5 text-gray-400" />
                            )}
                            <span className="text-gray-700 font-medium">Trạng thái đăng ký</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isSubscribed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}>
                            {isSubscribed ? 'Đã đăng ký' : 'Chưa đăng ký'}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {!isSubscribed ? (
                        <div className="space-y-2">
                            {permission === 'default' && (
                                <button
                                    onClick={handleRequestPermission}
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Đang xử lý...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Bell className="h-4 w-4" />
                                            <span>Cấp quyền thông báo</span>
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={handleSubscribe}
                                disabled={isLoading || permission === 'denied'}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : (
                                    <>
                                        <Bell className="h-4 w-4" />
                                        <span>Đăng ký thông báo</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <button
                                onClick={handleUnsubscribe}
                                disabled={isLoading}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : (
                                    <>
                                        <BellOff className="h-4 w-4" />
                                        <span>Hủy đăng ký</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleTestPush}
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Đang gửi...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        <span>Test thông báo</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {permission === 'denied' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                            <div>
                                <p className="text-yellow-800 font-medium">
                                    Quyền thông báo bị từ chối
                                </p>
                                <p className="text-yellow-700 text-sm mt-1">
                                    Để nhận thông báo, vui lòng:
                                </p>
                                <ol className="text-yellow-700 text-sm mt-2 list-decimal list-inside space-y-1">
                                    <li>Mở Settings của trình duyệt</li>
                                    <li>Tìm và chọn &quot;Notifications&quot; hoặc &quot;Thông báo&quot;</li>
                                    <li>Tìm trang web này và cho phép thông báo</li>
                                    <li>Refresh trang và thử lại</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PushNotificationSettings;
