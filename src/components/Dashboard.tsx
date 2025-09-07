'use client';

import { useState, useEffect, useCallback } from 'react';
import { LogOut, CreditCard, RefreshCw, Search, X, Menu, Clock, Home, ChevronRight, MapPin, Calendar, BarChart, BarChart3, CalendarClock, Settings, Users, DollarSign } from 'lucide-react';
import Popup from './Popup';
import AttendanceService from './AttendanceService';
import { AttendanceRecord, AttendanceSummary } from './AttendanceTypes';
import ShiftTable from './ShiftTable';
import ShiftSettings from './ShiftSettings';
import EmployeeManagement from './EmployeeManagement';
import AttendanceManagement from './AttendanceManagement';
import SalaryManagement from './SalaryManagement';

interface DashboardProps {
  onLogout: () => void;
}

interface Transaction {
  _id: string;
  // Thông tin tài khoản
  taiKhoanNhan: string;
  taiKhoanChuyen: string;
  tenNguoiChuyen: string;
  nganHangChuyen: string;

  // Thông tin giao dịch
  loaiGiaoDich: string;
  maGiaoDich: string;
  ngayGioGiaoDich: string;

  // Thông tin số tiền
  soTien: string;
  soTienNumber: number;
  phiGiaoDich: string;
  phiGiaoDichNumber: number;

  // Nội dung giao dịch
  noiDungGiaoDich: string;

  // Metadata
  emailId: string;
  historyId: string;
  processedAt: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface Filters {
  search: string;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [userName, setUserName] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: ''
  });
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  // Removed pagination states
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'home' | 'transactions' | 'attendance' | 'shifts' | 'admin'>('home');
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'employees' | 'attendance' | 'salary' | 'shiftSettings'>('overview');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string>('');
  const [attendanceSuccess, setAttendanceSuccess] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);

  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  // Admin overview stats
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [currentlyWorking, setCurrentlyWorking] = useState<number>(0);
  const [currentlyWorkingDetails, setCurrentlyWorkingDetails] = useState<Array<{
    userId: string;
    name: string;
    checkInTime: string;
    checkInTimeFormatted: string;
  }>>([]);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
    loadUserProfile();

    // Thiết lập auto-refresh (nhẹ, không hiển thị loading)
    const interval = setInterval(() => {
      checkForNewTransactions();
    }, 15000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, filters]);

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        onLogout();
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('https://worktime-dux3.onrender.com/api/auth/verify', { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUserName(data.user.name || 'User');
          setUserId(data.user.id || '');
          setUserRole(data.user.role || 'staff');
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  // Load admin overview stats
  const loadAdminOverviewStats = useCallback(async () => {
    if (userRole !== 'admin') return;

    try {
      setOverviewLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Get total employees count
      const totalResponse = await fetch('https://worktime-dux3.onrender.com/api/users/count', { headers });
      if (totalResponse.ok) {
        const totalData = await totalResponse.json();
        if (totalData.success) {
          setTotalEmployees(totalData.data.totalEmployees);
        }
      }

      // Get currently working employees
      const workingResponse = await fetch('https://worktime-dux3.onrender.com/api/users/currently-working', { headers });
      if (workingResponse.ok) {
        const workingData = await workingResponse.json();
        if (workingData.success) {
          setCurrentlyWorking(workingData.data.count);
          // Get detailed information about currently working employees
          if (workingData.data.currentlyWorking && workingData.data.currentlyWorking.length > 0) {
            setCurrentlyWorkingDetails(workingData.data.currentlyWorking.map((emp: {
              userId: string;
              name: string;
              checkInTime: string;
              checkInTimeFormatted: string;
            }) => ({
              userId: emp.userId,
              name: emp.name,
              checkInTime: emp.checkInTime,
              checkInTimeFormatted: emp.checkInTimeFormatted
            })));
          } else {
            setCurrentlyWorkingDetails([]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading admin overview stats:', error);
    } finally {
      setOverviewLoading(false);
    }
  }, [userRole]);

  // Load admin overview stats when user role is admin
  useEffect(() => {
    if (userRole === 'admin') {
      loadAdminOverviewStats();
    }
  }, [userRole, loadAdminOverviewStats]);

  // Refresh admin stats when switching to admin tab
  useEffect(() => {
    if (activeTab === 'admin' && userRole === 'admin') {
      loadAdminOverviewStats();
    }
  }, [activeTab, userRole, loadAdminOverviewStats]);

  // Define loadAttendanceSummary first with useCallback
  const loadAttendanceSummary = useCallback(async () => {
    try {
      if (!userId) {
        console.log('Không thể tải thống kê chấm công: userId không tồn tại');
        return;
      }

      setSummaryLoading(true);

      console.log(`Đang tải thống kê chấm công cho userId: ${userId}, tháng: ${selectedMonth + 1}, năm: ${selectedYear}`);
      const summary = await AttendanceService.getAttendanceSummary(userId, selectedMonth + 1, selectedYear);
      console.log('Đã nhận thống kê chấm công:', summary);

      // Make sure properties exist before setting state to prevent undefined errors
      if (summary) {
        // Set default values for potentially missing fields
        const processedSummary = {
          ...summary,
          totalDaysWorked: summary.totalDaysWorked || 0,
          totalWorkDuration: summary.totalWorkDuration || {
            formatted: '0h 0m',
            minutes: 0
          },
          averageWorkDurationPerDay: summary.averageWorkDurationPerDay || {
            formatted: '0h 0m',
            minutes: 0
          },
          month: summary.month || selectedMonth + 1,
          year: summary.year || selectedYear
        };
        setAttendanceSummary(processedSummary);
      } else {
        // If no summary data returned, create a default one
        setAttendanceSummary({
          userId: userId,
          totalDaysWorked: 0,
          totalWorkDuration: {
            formatted: '0h 0m',
            minutes: 0
          },
          averageWorkDurationPerDay: {
            formatted: '0h 0m',
            minutes: 0
          },
          month: selectedMonth + 1,
          year: selectedYear
        });
      }
    } catch (error) {
      console.error('Failed to load attendance summary:', error);
      // We don't show error for summary loading as it's not critical
      // Create default summary object on error
      setAttendanceSummary({
        userId: userId,
        totalDaysWorked: 0,
        totalWorkDuration: {
          formatted: '0h 0m',
          minutes: 0
        },
        averageWorkDurationPerDay: {
          formatted: '0h 0m',
          minutes: 0
        },
        month: selectedMonth + 1,
        year: selectedYear
      });
    } finally {
      setSummaryLoading(false);
    }
  }, [userId, selectedMonth, selectedYear]);

  // Define loadAttendanceHistory with useCallback
  const loadAttendanceHistory = useCallback(async () => {
    try {
      if (!userId) {
        console.log('Không thể tải lịch sử chấm công: userId không tồn tại');
        return;
      }

      setAttendanceLoading(true);
      setAttendanceError('');

      console.log(`Đang tải lịch sử chấm công cho userId: ${userId}, tháng: ${selectedMonth + 1}, năm: ${selectedYear}`);
      const history = await AttendanceService.getAttendanceHistory(userId, selectedMonth + 1, selectedYear);
      console.log(`Đã nhận ${history.length} bản ghi chấm công`);

      // Lọc lịch sử chấm công theo userId hiện tại
      const filteredHistory = history.filter(record => record.user === userId);
      console.log(`Sau khi lọc: ${filteredHistory.length} bản ghi thuộc về userId hiện tại`);

      // Log để debug định dạng thời gian
      if (filteredHistory.length > 0) {
        const firstRecord = filteredHistory[0];
        console.log('First record details:');
        console.log('- checkInTime:', firstRecord.checkInTime);
        console.log('- checkInTimeFormatted:', firstRecord.checkInTimeFormatted);
        console.log('- checkOutTime:', firstRecord.checkOutTime);
        console.log('- checkOutTimeFormatted:', firstRecord.checkOutTimeFormatted);
      }

      setAttendanceHistory(filteredHistory);

      // Load summary data
      await loadAttendanceSummary();
    } catch (error) {
      console.error('Failed to load attendance history:', error);
      setAttendanceError('Không thể tải lịch sử chấm công');
    } finally {
      setAttendanceLoading(false);
    }
  }, [userId, selectedMonth, selectedYear, loadAttendanceSummary]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendanceHistory();
    }
  }, [activeTab, loadAttendanceHistory]);

  // Effect to reload attendance history when month or year changes
  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendanceHistory();
    }
  }, [selectedMonth, selectedYear, activeTab, loadAttendanceHistory]);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        onLogout();
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all transactions from API
      try {
        console.log('Fetching transactions from API with headers:', headers);
        const transactionsResponse = await fetch(`/api/transactions?limit=0`, {
          headers,
          cache: 'no-store'
        });

        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          console.log('Transactions data:', transactionsData);
          // Handle nested structure where transactions are inside data object
          const transactions = transactionsData.data?.transactions || transactionsData.transactions || [];
          console.log('Extracted transactions:', transactions.length);
          setTransactions(transactions);
          setLastUpdateTime(new Date());
        } else {
          const errorText = await transactionsResponse.text();
          console.error(`Failed to load transactions (${transactionsResponse.status}):`, errorText);
          setError(`Không thể tải dữ liệu giao dịch: ${transactionsResponse.status}`);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setError('Lỗi kết nối đến API giao dịch');
      }
      // } else {
      //   setError('Không thể tải dữ liệu');
      // }
    } catch (error) {
      console.error('Load data error:', error);
      setError('Lỗi kết nối');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Removed infinite scroll functions



  const handleCheckIn = async () => {
    try {
      if (!userId) {
        setAttendanceError('Không thể xác định người dùng. Vui lòng đăng nhập lại.');
        return;
      }

      setLocationLoading(true);
      setAttendanceError('');
      setAttendanceSuccess('');

      const position = await AttendanceService.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      await AttendanceService.checkIn(userId, longitude, latitude);

      // Show success message with current time in HH:MM:SS format
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setAttendanceSuccess(`Check-in thành công lúc ${hours}:${minutes}:${seconds}`);

      // Tự động ẩn thông báo thành công sau 5 giây
      setTimeout(() => {
        setAttendanceSuccess('');
      }, 5000);

      // Reload attendance history
      await loadAttendanceHistory();
    } catch (error) {
      console.error('Check-in error:', error);
      setAttendanceError(error instanceof Error ? error.message : 'Không thể check-in. Vui lòng kiểm tra quyền truy cập vị trí.');
      setAttendanceSuccess('');

      // Tự động ẩn thông báo lỗi sau 5 giây
      setTimeout(() => {
        setAttendanceError('');
      }, 5000);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      if (!userId) {
        setAttendanceError('Không thể xác định người dùng. Vui lòng đăng nhập lại.');
        return;
      }

      setLocationLoading(true);
      setAttendanceError('');
      setAttendanceSuccess('');

      const position = await AttendanceService.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      await AttendanceService.checkOut(userId, longitude, latitude);

      // Show success message with current time in HH:MM:SS format
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setAttendanceSuccess(`Check-out thành công lúc ${hours}:${minutes}:${seconds}`);

      // Tự động ẩn thông báo thành công sau 5 giây
      setTimeout(() => {
        setAttendanceSuccess('');
      }, 5000);

      // Reload attendance history
      await loadAttendanceHistory();
    } catch (error) {
      console.error('Check-out error:', error);
      setAttendanceError(error instanceof Error ? error.message : 'Không thể check-out. Vui lòng kiểm tra quyền truy cập vị trí.');
      setAttendanceSuccess('');

      // Tự động ẩn thông báo lỗi sau 5 giây
      setTimeout(() => {
        setAttendanceError('');
      }, 5000);
    } finally {
      setLocationLoading(false);
    }
  };

  const checkForNewTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Chỉ lấy 5 giao dịch mới nhất để kiểm tra
      console.log('Checking for new transactions');
      const response = await fetch('/api/transactions?limit=5', {
        headers,
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Check new transactions response:', data);

        // Handle nested structure where transactions are inside data object
        const transactions = data.data?.transactions || data.transactions || [];

        if (transactions && transactions.length > 0) {
          console.log(`Found ${transactions.length} transactions to check`);
          const incoming: Transaction[] = transactions as Transaction[];
          setTransactions(prev => {
            const existingIds = new Set(prev.map(t => t._id));
            const newOnes = incoming.filter(t => !existingIds.has(t._id));
            // guard duplicates inside newOnes
            const seen = new Set<string>();
            const dedupNew = newOnes.filter(t => {
              if (seen.has(t._id)) return false;
              seen.add(t._id);
              return true;
            });
            if (dedupNew.length === 0) return prev;
            console.log(`Adding ${dedupNew.length} new transactions`);
            return [...dedupNew, ...prev];
          });
        }
      } else {
        console.error('Failed to check for new transactions:', await response.text());
      }
      // Dù có dữ liệu mới hay không, luôn cập nhật mốc thời gian "Cập nhật:" để người dùng biết lần đồng bộ gần nhất
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Check new transactions error:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(transaction =>
        transaction.tenNguoiChuyen?.toLowerCase().includes(searchLower) ||
        transaction.taiKhoanChuyen?.toLowerCase().includes(searchLower) ||
        transaction.taiKhoanNhan?.toLowerCase().includes(searchLower) ||
        transaction.noiDungGiaoDich?.toLowerCase().includes(searchLower) ||
        transaction.maGiaoDich?.toLowerCase().includes(searchLower) ||
        transaction.soTienNumber.toString().includes(searchLower) ||
        transaction.nganHangChuyen?.toLowerCase().includes(searchLower) ||
        transaction.loaiGiaoDich?.toLowerCase().includes(searchLower)
      );
    }





    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.ngayGioGiaoDich).getTime() - new Date(a.ngayGioGiaoDich).getTime());

    setFilteredTransactions(filtered);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(Math.abs(amount));
  };

  // Format as DD/MM/YYYY HH:MM:SS
  const formatDateTime = (dateTime?: string) => {
    if (!dateTime) return 'N/A';

    try {
      // Parse the date string
      const dateObj = new Date(dateTime);

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid dateTime:', dateTime);
        return 'N/A';
      }

      // Format as DD/MM/YYYY HH:MM:SS
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('Error formatting dateTime:', error);
      return 'N/A';
    }
  };

  // Formatting workload duration to human-readable format
  const formatWorkDuration = (minutes: number) => {
    if (minutes === 0) return '0m';

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${remainingMinutes}m`;
    }
  };



  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      onLogout();
    }
  };

  const openTransactionDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const closeTransactionDetail = () => {
    setSelectedTransaction(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Đang tải dữ liệu</h3>
          <p className="text-gray-600">Vui lòng chờ trong giây lát...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 md:pl-64">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:z-10`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Giorlin</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => { setActiveTab('home'); setSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'home' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Home className="h-5 w-5" />
                <span>Trang chủ</span>
                {activeTab === 'home' && <ChevronRight className="h-4 w-4 ml-auto" />}
              </button>
            </li>
            <li>
              <button
                onClick={() => { setActiveTab('transactions'); setSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'transactions' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Giao dịch</span>
                {activeTab === 'transactions' && <ChevronRight className="h-4 w-4 ml-auto" />}
              </button>
            </li>
            <li>
              <button
                onClick={() => { setActiveTab('attendance'); setSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'attendance' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Clock className="h-5 w-5" />
                <span>Chấm công</span>
                {activeTab === 'attendance' && <ChevronRight className="h-4 w-4 ml-auto" />}
              </button>
            </li>
            <li>
              <button
                onClick={() => { setActiveTab('shifts'); setSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'shifts' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <CalendarClock className="h-5 w-5" />
                <span>Đăng ký ca</span>
                {activeTab === 'shifts' && <ChevronRight className="h-4 w-4 ml-auto" />}
              </button>
            </li>
            {userRole === 'admin' && (
              <li>
                <button
                  onClick={() => { setActiveTab('admin'); setSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'admin' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <Settings className="h-5 w-5" />
                  <span>Quản lý</span>
                  {activeTab === 'admin' && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              </li>
            )}
            <li>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Đăng xuất</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-2 p-2 rounded-lg hover:bg-gray-100 md:hidden"
              >
                <Menu className="h-5 w-5 text-gray-700" />
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {
                  activeTab === 'home'
                    ? 'Trang chủ'
                    : activeTab === 'transactions'
                      ? 'Banking'
                      : activeTab === 'attendance'
                        ? 'Chấm công'
                        : activeTab === 'shifts'
                          ? 'Đăng ký ca'
                          : 'Quản lý'
                }
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <div className="text-xs sm:text-sm text-gray-800">
                {new Date().toLocaleDateString('vi-VN')}
              </div>
              {userName && (
                <div className="flex flex-col sm:flex-row sm:items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                  <span className="text-xs sm:text-sm font-medium text-center sm:text-left">
                    Hi, {userName}
                  </span>
                  {userRole === 'admin' && (
                    <span className="text-xs text-red-600 text-center sm:ml-1 sm:text-left">
                      (Admin)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 transition-all duration-300">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-6">Chào mừng đến với Giorlin</h2>
              <p className="text-gray-600 mb-4 sm:mb-8">Chọn một chức năng để tiếp tục</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg p-3 sm:p-5 transition-all duration-200 border border-blue-200 hover:border-blue-300 hover:shadow-md"
                >
                  <CreditCard className="h-8 w-8 sm:h-10 sm:w-10 mb-2" />
                  <h3 className="text-base sm:text-lg font-semibold">Banking</h3>
                  <p className="text-xs sm:text-sm mt-1 sm:mt-2 text-gray-600 hidden sm:block">Quản lý giao dịch</p>
                </button>

                <button
                  onClick={() => setActiveTab('attendance')}
                  className="flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-700 rounded-lg p-3 sm:p-5 transition-all duration-200 border border-green-200 hover:border-green-300 hover:shadow-md"
                >
                  <Clock className="h-8 w-8 sm:h-10 sm:w-10 mb-2" />
                  <h3 className="text-base sm:text-lg font-semibold">Chấm công</h3>
                  <p className="text-xs sm:text-sm mt-1 sm:mt-2 text-gray-600 hidden sm:block">Quản lý chấm công</p>
                </button>

                <button
                  onClick={() => setActiveTab('shifts')}
                  className="flex flex-col items-center justify-center bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg p-3 sm:p-5 transition-all duration-200 border border-purple-200 hover:border-purple-300 hover:shadow-md"
                >
                  <CalendarClock className="h-8 w-8 sm:h-10 sm:w-10 mb-2" />
                  <h3 className="text-base sm:text-lg font-semibold">Đăng ký ca</h3>
                  <p className="text-xs sm:text-sm mt-1 sm:mt-2 text-gray-600 hidden sm:block">Đăng ký ca làm</p>
                </button>

                {userRole === 'admin' && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className="flex flex-col items-center justify-center bg-red-50 hover:bg-red-100 text-red-700 rounded-lg p-3 sm:p-5 transition-all duration-200 border border-red-200 hover:border-red-300 hover:shadow-md"
                  >
                    <Settings className="h-8 w-8 sm:h-10 sm:w-10 mb-2" />
                    <h3 className="text-base sm:text-lg font-semibold">Quản lý</h3>
                    <p className="text-xs sm:text-sm mt-1 sm:mt-2 text-gray-600 hidden sm:block">Quản lý hệ thống</p>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg text-gray-800 mb-4">Thông báo gần đây</h3>
              <div className="p-4 bg-blue-50 rounded-lg text-blue-700 text-center">
                <p>Không có thông báo mới</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shifts' && (
          <ShiftTable
            userId={userId}
            userName={userName}
            isAdmin={userRole === 'admin'}
          />
        )}

        {activeTab === 'admin' && userRole === 'admin' && (
          <div className="space-y-6">
            {/* Admin Dashboard Header */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <Settings className="h-6 w-6 mr-3 text-red-600" />
                Quản lý hệ thống
              </h2>
              <p className="text-gray-600">Chào mừng Admin! Chọn chức năng quản lý để tiếp tục</p>
            </div>

            {/* Admin Tab Navigation */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setAdminSubTab('overview')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'overview'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    title="Tổng quan"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 sm:hidden" />
                      <span className="hidden sm:inline">Tổng quan</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setAdminSubTab('employees')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'employees'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    title="Quản lý nhân viên"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 sm:hidden" />
                      <span className="hidden sm:inline">Quản lý nhân viên</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setAdminSubTab('attendance')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'attendance'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    title="Quản lý chấm công"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 sm:hidden" />
                      <span className="hidden sm:inline">Quản lý chấm công</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setAdminSubTab('salary')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'salary'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    title="Quản lý lương"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 sm:hidden" />
                      <span className="hidden sm:inline">Quản lý lương</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setAdminSubTab('shiftSettings')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminSubTab === 'shiftSettings'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    title="Cấu hình đăng ký ca"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 sm:hidden" />
                      <span className="hidden sm:inline">Cấu hình ca</span>
                    </div>
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {adminSubTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Thống kê tổng quan</h3>
                      <button
                        onClick={loadAdminOverviewStats}
                        disabled={overviewLoading}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                      >
                        <RefreshCw className={`h-4 w-4 ${overviewLoading ? 'animate-spin' : ''}`} />
                        {overviewLoading ? 'Đang tải...' : 'Làm mới'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <Users className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">Tổng nhân viên</p>
                            {overviewLoading ? (
                              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                            ) : (
                              <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                          <Clock className="h-8 w-8 text-green-600 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">Đang làm việc</p>
                            {overviewLoading ? (
                              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                            ) : (
                              <p className="text-2xl font-bold text-gray-900">{currentlyWorking}</p>
                            )}
                          </div>
                        </div>

                        {/* Danh sách nhân viên đang làm việc */}
                        {!overviewLoading && currentlyWorkingDetails.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 mb-2">Chi tiết:</p>
                            {currentlyWorkingDetails.map((employee, index) => (
                              <div key={employee.userId} className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-medium text-green-600">{index + 1}</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">Check-in:</p>
                                    <p className="text-sm font-medium text-green-600">
                                      {employee.checkInTimeFormatted ||
                                        (employee.checkInTime ? new Date(employee.checkInTime).toTimeString().slice(0, 5) : '--:--')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {!overviewLoading && currentlyWorkingDetails.length === 0 && currentlyWorking === 0 && (
                          <div className="text-center py-2">
                            <p className="text-xs text-gray-400">Không có nhân viên nào đang làm việc</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                          <Users className="h-8 w-8 text-blue-600 mr-3" />
                          <h3 className="text-lg font-semibold text-gray-800">Quản lý nhân viên</h3>
                        </div>
                        <p className="text-gray-600 mb-4">Quản lý thông tin, quyền hạn và trạng thái của nhân viên trong hệ thống</p>
                        <button
                          onClick={() => setAdminSubTab('employees')}
                          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                        >
                          Xem danh sách nhân viên
                        </button>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                          <Clock className="h-8 w-8 text-green-600 mr-3" />
                          <h3 className="text-lg font-semibold text-gray-800">Quản lý chấm công</h3>
                        </div>
                        <p className="text-gray-600 mb-4">Theo dõi và quản lý lịch sử chấm công của tất cả nhân viên</p>
                        <button
                          onClick={() => setAdminSubTab('attendance')}
                          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                        >
                          Xem báo cáo chấm công
                        </button>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                          <DollarSign className="h-8 w-8 text-yellow-600 mr-3" />
                          <h3 className="text-lg font-semibold text-gray-800">Quản lý lương</h3>
                        </div>
                        <p className="text-gray-600 mb-4">Tính lương và quản lý mức lương theo giờ của nhân viên</p>
                        <button
                          onClick={() => setAdminSubTab('salary')}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                        >
                          Xem báo cáo lương
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {adminSubTab === 'employees' && (
                  <EmployeeManagement isAdmin={userRole === 'admin'} />
                )}

                {adminSubTab === 'attendance' && (
                  <AttendanceManagement isAdmin={userRole === 'admin'} />
                )}

                {adminSubTab === 'salary' && (
                  <SalaryManagement isAdmin={userRole === 'admin'} />
                )}

                {adminSubTab === 'shiftSettings' && (
                  <ShiftSettings isAdmin={userRole === 'admin'} />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  Tìm kiếm giao dịch
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, nội dung, mã giao dịch, số tiền..."
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
                {filters.search && (
                  <div className="mt-2 text-center">
                    <button
                      onClick={() => handleFilterChange('search', '')}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      Xóa tìm kiếm
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            <Popup
              message={error}
              type="error"
              onClose={() => setError('')}
            />

            {/* Transactions List */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                    <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-600" />
                    Danh sách giao dịch
                  </h2>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-700">
                        {filteredTransactions.length} giao dịch
                      </span>
                      {lastUpdateTime && (
                        <p className="text-xs text-gray-500">
                          Cập nhật: {lastUpdateTime.toLocaleTimeString('vi-VN')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => loadData()}
                      disabled={loading}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200 disabled:opacity-50 hover:bg-blue-50 rounded-lg"
                      title="Làm mới"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="p-4 sm:p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 border-l-4 border-transparent hover:border-blue-400"
                      onClick={() => openTransactionDetail(transaction)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="text-sm font-semibold text-gray-900 break-words w-full sm:w-auto">
                              {transaction.tenNguoiChuyen}
                            </p>
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                              {transaction.taiKhoanChuyen}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {transaction.nganHangChuyen}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap break-words">
                            {transaction.noiDungGiaoDich || 'Không có mô tả'}
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            Mã GD: {transaction.maGiaoDich}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg sm:text-xl font-bold ${transaction.soTienNumber > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                            }`}>
                            {transaction.soTienNumber > 0 ? '+' : ''}
                            {formatCurrency(transaction.soTienNumber)}
                          </p>
                          <div className="flex flex-col items-end text-xs text-gray-500 mt-1">
                            <span className="mb-1">{formatDateTime(transaction.ngayGioGiaoDich)}</span>
                            <span className="text-blue-600 font-medium">{transaction.loaiGiaoDich}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg mb-2">
                      {filters.search
                        ? 'Không tìm thấy giao dịch nào phù hợp'
                        : 'Chưa có giao dịch nào'
                      }
                    </p>
                    {filters.search && (
                      <p className="text-gray-400 text-sm">
                        Thử tìm kiếm với từ khóa khác
                      </p>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Attendance UI */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center mb-4">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-600" />
                  Chấm công hôm nay
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleCheckIn}
                    disabled={locationLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {locationLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span className="font-medium">Đang lấy vị trí...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-5 w-5" />
                        <span className="font-medium">Check In</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCheckOut}
                    disabled={locationLoading}
                    className="bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {locationLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span className="font-medium">Đang lấy vị trí...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-5 w-5" />
                        <span className="font-medium">Check Out</span>
                      </>
                    )}
                  </button>
                </div>

                <Popup
                  message={attendanceError}
                  type="error"
                  onClose={() => setAttendanceError('')}
                />

                <Popup
                  message={attendanceSuccess}
                  type="success"
                  onClose={() => setAttendanceSuccess('')}
                />
              </div>

              <div>
                <div className="flex flex-col space-y-4 mb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-medium text-gray-900">Lịch sử chấm công</h3>
                    <button
                      onClick={loadAttendanceHistory}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      disabled={attendanceLoading}
                    >
                      <RefreshCw className={`h-3 w-3 ${attendanceLoading ? 'animate-spin' : ''}`} />
                      <span>Làm mới</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tháng</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Năm</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - 2 + i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                </div>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng giờ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceLoading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span>Đang tải...</span>
                            </div>
                          </td>
                        </tr>
                      ) : attendanceHistory.length > 0 ? (
                        attendanceHistory.map((record: AttendanceRecord) => (
                          <tr key={record._id} className={!record.isValid ? "bg-red-50" : ""}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.checkInTime ? new Date(record.checkInTime).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}
                              {!record.isValid && <span className="ml-2 text-xs text-red-500">(Không hợp lệ)</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.workTimeFormatted || (record.workDuration !== undefined ? formatWorkDuration(record.workDuration) : '--:--')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            Chưa có dữ liệu chấm công
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                  {attendanceLoading ? (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-500">Đang tải...</span>
                      </div>
                    </div>
                  ) : attendanceHistory.length > 0 ? (
                    <div className="space-y-4">
                      {attendanceHistory.map((record: AttendanceRecord) => (
                        <div
                          key={record._id}
                          className={`border rounded-lg shadow-sm p-4 ${!record.isValid ? "bg-red-50 border-red-100" : "bg-white border-gray-200"}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-sm font-medium text-gray-900">
                              📅 {record.checkInTime ? new Date(record.checkInTime).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'N/A'}
                            </div>
                            {!record.isValid && (
                              <span className="text-xs text-red-500 px-2 py-1 bg-red-100 rounded-full">
                                Không hợp lệ
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Check In:</span>
                              <span className="text-gray-900">
                                {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Check Out:</span>
                              <span className="text-gray-900">
                                {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '--:--'}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                              <span className="text-gray-500">Tổng giờ:</span>
                              <span className="font-medium text-blue-600">
                                {record.workTimeFormatted || (record.workDuration !== undefined ? formatWorkDuration(record.workDuration) : '--:--')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-500">
                      Chưa có dữ liệu chấm công
                    </div>
                  )}
                </div>

                {/* Attendance Summary Section */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 flex items-center">
                      <BarChart className="h-4 w-4 mr-2 text-blue-600" />
                      Tổng kết chấm công tháng {selectedMonth + 1}/{selectedYear}
                    </h3>
                  </div>

                  {summaryLoading ? (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-500">Đang tải thống kê...</span>
                      </div>
                    </div>
                  ) : attendanceSummary ? (
                    <div>
                      {/* Desktop Summary */}
                      <div className="hidden md:block overflow-hidden bg-white shadow-sm rounded-lg">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-700">Tổng kết chấm công tháng {attendanceSummary.month}/{attendanceSummary.year}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Tổng số ngày làm việc</p>
                            <p className="text-xl font-bold text-blue-700">{attendanceSummary.totalDaysWorked || 0} <span className="text-sm font-normal">ngày</span></p>
                          </div>

                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Tổng thời gian làm việc</p>
                            <p className="text-xl font-bold text-green-700">{attendanceSummary.totalWorkDuration?.formatted || '0h 0m'}</p>
                            <p className="text-xs text-gray-500 mt-1">{((attendanceSummary.totalWorkDuration?.minutes || 0) / 60).toFixed(1)} giờ</p>
                          </div>

                          <div className="p-3 bg-purple-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Giờ làm trung bình</p>
                            <p className="text-xl font-bold text-purple-700">{attendanceSummary.averageWorkDurationPerDay?.formatted || '0h 0m'}</p>
                          </div>


                        </div>
                      </div>

                      {/* Mobile Summary */}
                      <div className="md:hidden">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                              <p className="text-sm font-medium text-gray-700">Tổng kết tháng {attendanceSummary.month}/{attendanceSummary.year}</p>
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Số ngày làm việc:</span>
                              <span className="text-sm font-medium">{attendanceSummary.totalDaysWorked || 0} ngày</span>
                            </div>



                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Tổng thời gian:</span>
                              <span className="text-sm font-medium text-blue-600">{attendanceSummary.totalWorkDuration?.formatted || '0h 0m'}</span>
                            </div>

                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Trung bình:</span>
                              <span className="text-sm font-medium">{attendanceSummary.averageWorkDurationPerDay?.formatted || '0h 0m'}</span>
                            </div>


                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Không có dữ liệu thống kê cho tháng {selectedMonth + 1}/{selectedYear}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10">
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Chi tiết giao dịch
                </h3>
                <button
                  onClick={closeTransactionDetail}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Transaction Info */}
              <div className="space-y-4">
                {/* Amount */}
                <div className="text-center py-4 border-b border-gray-200">
                  <p className={`text-2xl sm:text-3xl font-bold ${selectedTransaction.soTienNumber > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                    }`}>
                    {selectedTransaction.soTienNumber > 0 ? '+' : ''}
                    {formatCurrency(selectedTransaction.soTienNumber)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    VND
                  </p>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${selectedTransaction.soTienNumber > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {selectedTransaction.soTienNumber > 0 ? 'Tiền vào' : 'Tiền ra'}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã giao dịch
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTransaction.maGiaoDich}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {formatDateTime(selectedTransaction.ngayGioGiaoDich)}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại giao dịch
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTransaction.loaiGiaoDich}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên người chuyển
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTransaction.tenNguoiChuyen}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tài khoản chuyển
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTransaction.taiKhoanChuyen}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngân hàng chuyển
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTransaction.nganHangChuyen}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tài khoản nhận
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTransaction.taiKhoanNhan}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phí giao dịch
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTransaction.phiGiaoDich}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nội dung chuyển khoản
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                    {selectedTransaction.noiDungGiaoDich}
                  </p>
                </div>


              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeTransactionDetail}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
