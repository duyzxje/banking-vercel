'use client';

import React from 'react';
import { ShiftEvent } from './ShiftTypes';

interface EventContentProps {
    event: ShiftEvent;
}

// Component hiển thị nội dung của event (ca làm việc)
const EventContent: React.FC<EventContentProps> = ({ event }) => {
    const { title, start, end, isLive } = event;

    // Format thời gian từ Date
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    const startTime = formatTime(start);
    const endTime = formatTime(end);

    return (
        <div className="event-content">
            <div className="text-xs font-medium mb-1">{title}</div>
            <div className="text-xs whitespace-normal">
                {startTime} - {endTime}
            </div>

            {/* Hiển thị trạng thái hoặc loại event */}
            <div className="text-xs mt-1 font-medium">
                {isLive ? (
                    <span className="text-red-600">Buổi Live</span>
                ) : (
                    <span className="text-blue-600">{title}</span>
                )}
            </div>
        </div>
    );
};

export default EventContent;
