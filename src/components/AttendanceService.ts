'use client';

interface CheckInOutData {
    longitude: number;
    latitude: number;
    notes?: string;
    officeId?: string;
}

interface AttendanceRecord {
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

const API_URL = 'https://worktime-dux3.onrender.com/api';

export const AttendanceService = {
    async checkIn(data: CheckInOutData): Promise<AttendanceRecord> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Unauthorized');
        }

        const response = await fetch(`${API_URL}/attendance/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to check in');
        }

        return response.json();
    },

    async checkOut(data: CheckInOutData): Promise<AttendanceRecord> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Unauthorized');
        }

        const response = await fetch(`${API_URL}/attendance/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to check out');
        }

        return response.json();
    },

    async getAttendanceHistory(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Unauthorized');
        }

        let url = `${API_URL}/attendance`;
        const params = new URLSearchParams();

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch attendance history');
        }

        return response.json();
    },

    async getCurrentPosition(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
    }
};

export default AttendanceService;
