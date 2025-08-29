'use client';

import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TwoRowHeaderProps {
    date: Date;
    weekday?: boolean;
}

// Component hiển thị header 2 dòng: thứ ở trên, ngày ở dưới
const TwoRowHeader: React.FC<TwoRowHeaderProps> = ({ date, weekday = true }) => {
    // Format thứ (ví dụ: Thứ 2, Thứ 3, CN)
    const dayName = format(date, weekday ? 'EEEE' : 'EEE', { locale: vi })
        .replace('thứ ', 'Thứ ')
        .replace('chủ nhật', 'CN');

    // Format ngày (ví dụ: 05/11)
    const dayNumber = format(date, 'dd/MM', { locale: vi });

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="text-xs font-semibold">{dayName}</div>
            <div className="text-xs">{dayNumber}</div>
        </div>
    );
};

export default TwoRowHeader;
