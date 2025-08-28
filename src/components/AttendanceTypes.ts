export interface CheckInOutData {
    userId: string;
    longitude: number;
    latitude: number;
    notes?: string;
    officeId?: string;
}

export interface AttendanceRecord {
    _id: string;
    user: string;
    checkInTime: string;
    checkInTimeFormatted: string;
    checkInDateFormatted: string;
    checkOutTime?: string;
    checkOutTimeFormatted?: string;
    checkInLocation?: {
        type: string;
        coordinates: [number, number];
    };
    checkOutLocation?: {
        type: string;
        coordinates: [number, number];
    };
    status: 'checked-in' | 'checked-out';
    isValid: boolean;
    officeId?: string;
    workDuration?: number;
    workTimeFormatted?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AttendanceSummary {
    userId: string;             // ID người dùng
    month: number;              // Tháng được thống kê
    year: number;               // Năm được thống kê
    totalDaysWorked: number;    // Tổng số ngày làm việc
    totalWorkDuration: {
        formatted: string;      // Định dạng thời gian làm việc (VD: "0h25m")
        minutes: number;        // Số phút làm việc
    };
    averageWorkDurationPerDay: {
        formatted: string;      // Thời gian làm việc trung bình/ngày
        minutes: number;        // Số phút trung bình/ngày
    };
    dailyRecords?: Array<{
        date: string;           // Ngày (YYYY-MM-DD)
        dayOfWeek: number;      // Thứ trong tuần (0-6)
        records: AttendanceRecord[];  // Bản ghi chấm công theo ngày
    }>;
    earliestCheckIn?: {
        formatted: string;      // Giờ check-in sớm nhất (HH:MM)
        time: string;           // Timestamp đầy đủ
    };
    latestCheckOut?: {
        formatted: string;      // Giờ check-out muộn nhất (HH:MM)
        time: string;           // Timestamp đầy đủ
    };
    incompleteRecords?: number; // Số bản ghi chưa hoàn thành

    // Legacy fields - để hỗ trợ phần code hiện tại
    totalDays?: number;
    totalValidDays?: number;
    totalWorkHours?: number;
    totalWorkMinutes?: number;
    workTimeFormatted?: string;
    averageWorkHours?: number;
}