export interface CheckInOutData {
    longitude: number;
    latitude: number;
    notes?: string;
    officeId?: string;
}

export interface AttendanceRecord {
    _id: string;
    userId: string;
    date: string;
    checkIn: {
        time: string;
        coordinates: {
            longitude: number;
            latitude: number;
        };
        officeId?: string;
        notes?: string;
    };
    checkOut?: {
        time: string;
        coordinates: {
            longitude: number;
            latitude: number;
        };
        notes?: string;
    };
    totalHours?: string;
    createdAt: string;
    updatedAt: string;
}
