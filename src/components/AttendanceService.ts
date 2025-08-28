'use client';

import { CheckInOutData, AttendanceRecord, AttendanceSummary } from './AttendanceTypes';

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

    async getAttendanceHistory(userId: string, month?: number, year?: number): Promise<AttendanceRecord[]> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Unauthorized');
        }

        // Build URL with optional month/year query parameters
        let url = `${API_URL}/attendance/${userId}`;

        // Add month and year as query parameters if they exist
        const queryParams = [];
        if (month) queryParams.push(`month=${month}`);
        if (year) queryParams.push(`year=${year}`);

        if (queryParams.length > 0) {
            url += `?${queryParams.join('&')}`;
        }

        // Log request details
        console.log('Fetching attendance history:', {
            userId,
            month,
            year,
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

            // Log the first record for debugging time format issues
            if (result.attendance.length > 0) {
                console.log('Sample record:', JSON.stringify(result.attendance[0]));
            }

            // Return the original records from API without any processing
            console.log('Using original records from API without time formatting');
            return result.attendance;
        }

        // Fallback to the old format if needed
        if (Array.isArray(result)) {
            // Log the first record for debugging time format issues
            if (result.length > 0) {
                console.log('Sample record (old format):', JSON.stringify(result[0]));
            }

            // Return the original records from API without any processing
            console.log('Using original records from API without time formatting (old format)');
            return result;
        }

        return [];
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
    },

    async getAttendanceSummary(userId: string, month?: number, year?: number): Promise<AttendanceSummary> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Unauthorized');
        }

        // Build URL with optional month/year query parameters
        let url = `${API_URL}/attendance/${userId}/summary`;

        // Add month and year as query parameters if they exist
        const queryParams = [];
        if (month) queryParams.push(`month=${month}`);
        if (year) queryParams.push(`year=${year}`);

        if (queryParams.length > 0) {
            url += `?${queryParams.join('&')}`;
        }

        // Log request details
        console.log('Fetching attendance summary:', {
            userId,
            month,
            year,
            url
        });

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Fetch attendance summary failed:', errorData);
            throw new Error(errorData.message || 'Failed to fetch attendance summary');
        }

        const result = await response.json();
        console.log('Attendance summary response:', result);

        return result.summary || result;
    }
};

export default AttendanceService;
