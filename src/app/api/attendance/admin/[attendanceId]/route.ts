import { NextResponse } from 'next/server';

const API_URL = 'https://worktime-dux3.onrender.com/api';

function parseDateTimeParts(dateStr?: string, timeStr?: string): string | undefined {
    if (!dateStr || !timeStr) return undefined;
    // Expecting date YYYY-MM-DD and time HH:mm
    const iso = `${dateStr}T${timeStr}:00.000Z`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export async function PUT(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, message: 'Token không được cung cấp' }, { status: 401 });
        }

        const pathname = new URL(request.url).pathname;
        const segments = pathname.split('/').filter(Boolean);
        const attendanceId = segments[segments.length - 1];
        const body = await request.json();

        const { checkInDate, checkInTimePart, checkOutDate, checkOutTimePart, notes, officeId } = body || {};
        let { checkInTime, checkOutTime } = body || {};

        // Normalize inputs: if parts provided, build ISO
        if (!checkInTime) {
            const built = parseDateTimeParts(checkInDate, checkInTimePart);
            if (built) checkInTime = built;
        }
        if (!checkOutTime) {
            const built = parseDateTimeParts(checkOutDate, checkOutTimePart);
            if (built) checkOutTime = built;
        }

        // Validate ordering if both provided
        if (checkInTime && checkOutTime) {
            const inDate = new Date(checkInTime);
            const outDate = new Date(checkOutTime);
            if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
                return NextResponse.json({ success: false, message: 'Thời gian không hợp lệ' }, { status: 400 });
            }
            if (outDate <= inDate) {
                return NextResponse.json({ success: false, message: 'checkOut phải sau checkIn' }, { status: 400 });
            }
        }

        const forwardPayload: Record<string, unknown> = {};
        if (checkInTime) forwardPayload.checkInTime = checkInTime;
        if (checkOutTime) forwardPayload.checkOutTime = checkOutTime;
        if (notes !== undefined) forwardPayload.notes = notes;
        if (officeId !== undefined) forwardPayload.officeId = officeId;

        // Forward to backend
        const response = await fetch(`${API_URL}/attendance/admin/${attendanceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(forwardPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                return NextResponse.json({ success: false, message: errorData.message || 'Cập nhật chấm công thất bại' }, { status: response.status });
            } catch {
                return NextResponse.json({ success: false, message: 'Cập nhật chấm công thất bại' }, { status: response.status });
            }
        }

        const result = await response.json();
        return NextResponse.json(result);

    } catch (error) {
        console.error('Update attendance error:', error);
        return NextResponse.json({ success: false, message: 'Lỗi khi cập nhật chấm công' }, { status: 500 });
    }
}


