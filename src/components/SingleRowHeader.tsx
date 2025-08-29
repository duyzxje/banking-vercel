'use client';

import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SingleRowHeaderProps {
    date: Date;
}

// Component hiển thị header 1 dòng chỉ có thứ + ngày
const SingleRowHeader: React.FC<SingleRowHeaderProps> = ({ date }) => {
    // Lấy ngày (dạng số)
    const dayNumber = format(date, 'dd/MM', { locale: vi });

    // Lấy thứ, định dạng "Thứ X" hoặc "CN"
    let dayName = format(date, 'EEEE', { locale: vi })
        .replace('thứ ', 'Thứ ')
        .replace('chủ nhật', 'CN');

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="text-xs font-semibold">{dayName}</div>
            <div className="text-xs">{dayNumber}</div>
        </div>
    );
};

export default SingleRowHeader;
