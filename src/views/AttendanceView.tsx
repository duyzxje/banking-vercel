'use client';

import AttendanceManagement from '@/components/AttendanceManagement';

export default function AttendanceView() {
    // Dashboard tab trước đây hiển thị phần chấm công quản trị.
    // Tái sử dụng nguyên component AttendanceManagement để giữ nguyên UI/CSS.
    return <AttendanceManagement isAdmin={true} />;
}


