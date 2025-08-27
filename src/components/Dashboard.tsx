'use client';

import { useState, useEffect, useCallback } from 'react';
import { LogOut, CreditCard, RefreshCw, Search, X, Menu, Clock, Home, ChevronRight, MapPin, AlertCircle } from 'lucide-react';
import AttendanceService from './AttendanceService';
import { AttendanceRecord } from './AttendanceTypes';

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
  const [activeTab, setActiveTab] = useState<'transactions' | 'attendance'>('transactions');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string>('');
  const [attendanceSuccess, setAttendanceSuccess] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState<boolean>(false);

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

  const [userId, setUserId] = useState<string>('');

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

      const response = await fetch('/api/auth/verify', { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUserName(data.user.name || data.user.username || 'User');
          setUserId(data.user.id || '');
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  // Define loadAttendanceHistory with useCallback
  const loadAttendanceHistory = useCallback(async () => {
    try {
      if (!userId) {
        console.log('Không thể tải lịch sử chấm công: userId không tồn tại');
        return;
      }

      setAttendanceLoading(true);
      setAttendanceError('');

      console.log(`Đang tải lịch sử chấm công cho userId: ${userId}`);
      const history = await AttendanceService.getAttendanceHistory(userId);
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
    } catch (error) {
      console.error('Failed to load attendance history:', error);
      setAttendanceError('Không thể tải lịch sử chấm công');
    } finally {
      setAttendanceLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendanceHistory();
    }
  }, [activeTab, loadAttendanceHistory]);

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

      // Fetch all transactions
      const transactionsResponse = await fetch(`/api/transactions?limit=0`, { headers });

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
        setLastUpdateTime(new Date());
      } else {
        setError('Không thể tải dữ liệu');
      }
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

      const result = await AttendanceService.checkIn(userId, longitude, latitude);

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

      const result = await AttendanceService.checkOut(userId, longitude, latitude);

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
      const response = await fetch('/api/transactions?limit=5', {
        headers
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.transactions.length > 0) {
          const incoming: Transaction[] = data.transactions as Transaction[];
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
            return [...dedupNew, ...prev];
          });
        }
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

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';

    try {
      // Parse the date string
      const dateObj = new Date(date);

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date:', date);
        return 'N/A';
      }

      // Format as DD/MM/YYYY
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '--:--';

    try {
      // Parse the timestamp string
      const dateObj = new Date(timestamp);

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid timestamp:', timestamp);
        return '--:--';
      }

      // Log the timestamp and parsed date for debugging
      console.log('Formatting timestamp:', timestamp);
      console.log('Parsed date object:', dateObj.toString());
      console.log('Parsed date ISO:', dateObj.toISOString());
      console.log('Local timezone offset (minutes):', dateObj.getTimezoneOffset());

      // Check if the timestamp has checkInTimeFormatted in the API response
      if (timestamp.includes('checkInTimeFormatted') || timestamp.includes('checkOutTimeFormatted')) {
        console.log('Found formatted time in timestamp string');
      }

      // Use the formatted time from API if available
      if (typeof timestamp === 'string' && timestamp.length <= 5 && timestamp.includes(':')) {
        console.log('Using timestamp directly as it appears to be formatted already:', timestamp);
        return timestamp;
      }

      // Get local hours and minutes (in user's timezone)
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();

      // Format as HH:MM with leading zeros
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      console.log('Formatted time result:', formattedTime);
      return formattedTime;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:fixed md:z-10`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Giorlin App</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => { setActiveTab('transactions'); setSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'transactions' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Home className="h-5 w-5" />
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
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 md:pl-72">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-2 p-2 rounded-lg hover:bg-gray-100 md:hidden"
              >
                <Menu className="h-5 w-5 text-gray-700" />
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {activeTab === 'transactions' ? 'Giao dịch ngân hàng' : 'Chấm công'}
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <div className="text-xs sm:text-sm text-gray-500 hidden xs:block">
                {new Date().toLocaleDateString('vi-VN')}
              </div>
              {userName && (
                <div className="flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                  <span className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-none">Hi, {userName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:ml-64 transition-all duration-300 md:pl-8">
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
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

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
                            <span className="mb-1">{formatDate(transaction.ngayGioGiaoDich)}</span>
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

                {attendanceError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="text-sm text-red-600">{attendanceError}</p>
                  </div>
                )}

                {attendanceSuccess && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                    <div className="h-5 w-5 text-green-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-green-600">{attendanceSuccess}</p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
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
                <div className="overflow-x-auto">
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
                              {record.workTimeFormatted || (record.workDuration !== undefined ? `${record.workDuration}` : '--:--')}
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
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                      {formatDate(selectedTransaction.ngayGioGiaoDich)}
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
