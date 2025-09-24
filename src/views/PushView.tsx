'use client';

import PushNotificationSettings from '@/components/PushNotificationSettings';

export default function PushView() {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Cài đặt thông báo</h3>
                <PushNotificationSettings />
            </div>
        </div>
    );
}


