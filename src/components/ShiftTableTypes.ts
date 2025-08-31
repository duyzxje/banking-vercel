export type ShiftType = 'morning' | 'noon' | 'afternoon' | 'evening' | 'off';

// Cấu trúc mới cho phép đăng ký nhiều ca trong một ngày
export type DayShifts = {
    morning?: boolean;
    noon?: boolean;
    afternoon?: boolean;
    evening?: boolean;
    off?: boolean;
};

export interface ShiftSlot {
    userId: string;
    username: string;
    day: number; // 1-7 (thứ 2 đến chủ nhật)
    shift: ShiftType;
}

export interface EmployeeShift {
    userId: string;
    username: string;
    shifts: {
        // key là thứ (1-7, 1 = thứ 2, 7 = chủ nhật)
        [day: number]: DayShifts;
    };
}

export interface LiveEvent {
    day: number; // 1-7 (thứ 2 đến chủ nhật)
    shift: ShiftType;
    description?: string;
}

export interface WeekShifts {
    employees: EmployeeShift[];
    liveEvents: {
        [day: number]: ShiftType;
    };
    startDate: string; // Ngày đầu tiên của tuần (định dạng YYYY-MM-DD)
    endDate: string; // Ngày cuối cùng của tuần (định dạng YYYY-MM-DD)
}

export interface ShiftTableProps {
    userId: string;
    userName: string;
    isAdmin: boolean;
    weekStartDate?: Date;
}

export const SHIFT_LABELS: Record<ShiftType, string> = {
    morning: 'Sáng',
    noon: 'Trưa',
    afternoon: 'Chiều',
    evening: 'Tối',
    off: 'Off'
};

export const SHIFT_TIMES: Record<ShiftType, string> = {
    morning: '06:00 - 12:00',
    noon: '12:00 - 14:00',
    afternoon: '14:00 - 18:00',
    evening: '18:00 - 22:00',
    off: '-'
};

export const DAY_NAMES = [
    'Thứ 2', 'Thứ 3', 'Thứ 4',
    'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'
];
