export interface ShiftEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    userId: string;
    isLive?: boolean; // Để phân biệt event Live từ admin
    description?: string;
    status?: 'pending' | 'approved' | 'rejected'; // Trạng thái đăng ký ca
    createdAt?: string;
    updatedAt?: string;
}

export interface ShiftRegistrationProps {
    userId: string;
    userName: string;
    isAdmin?: boolean;
}

export interface WeekNavigationProps {
    currentDate: Date;
    onNavigate: (date: Date) => void;
}
