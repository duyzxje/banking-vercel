'use client';

import { CheckInOutData, AttendanceRecord } from './AttendanceTypes';

const API_URL = 'https://worktime-dux3.onrender.com/api';

export const AttendanceService = {
    async checkIn(userId: string, longitude: number, latitude: number, notes?: string, officeId?: string): Promise<AttendanceRecord> {
        const data: CheckInOutData = {
            userId,
            longitude,
            latitude,
            notes,
            officeId
        };
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Unauthorized');
        }

        // Log data being sent to backend
        console.log('Check-in data being sent:', {
            userId,
            longitude,
            latitude,
            notes,
            officeId
        });

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
            console.error('Check-in failed:', errorData);
            throw new Error(errorData.message || 'Failed to check in');
        }

        const result = await response.json();
        console.log('Check-in response:', result);
        return result;
    },

    async checkOut(userId: string, longitude: number, latitude: number, notes?: string): Promise<AttendanceRecord> {
        const data: CheckInOutData = {
            userId,
            longitude,
            latitude,
            notes
        };
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Unauthorized');
        }

        // Log data being sent to backend
        console.log('Check-out data being sent:', {
            userId,
            longitude,
            latitude,
            notes
        });

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
            console.error('Check-out failed:', errorData);
            throw new Error(errorData.message || 'Failed to check out');
        }

        const result = await response.json();
        console.log('Check-out response:', result);
        return result;
    },

    async getAttendanceHistory(userId: string): Promise<AttendanceRecord[]> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Unauthorized');
        }

        const url = `${API_URL}/attendance/${userId}`;

        // Log request details
        console.log('Fetching attendance history:', {
            userId,
            url
        });

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Fetch attendance history failed:', errorData);
            throw new Error(errorData.message || 'Failed to fetch attendance history');
        }

        const result = await response.json();
        console.log('Attendance history response:', result);

        // Handle the new API response format
        if (result.attendance && Array.isArray(result.attendance)) {
            console.log(`Received ${result.attendance.length} attendance records from API`);
            return result.attendance;
        }

        // Fallback to the old format if needed
        return Array.isArray(result) ? result : [];
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
