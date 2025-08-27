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
