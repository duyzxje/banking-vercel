'use client';

import { useState, useEffect } from 'react';
import { LogOut, CreditCard, RefreshCw, Search, X, Menu, Clock, Users, Home, Calendar, ChevronRight, MapPin, AlertCircle } from 'lucide-react';
import AttendanceService from './AttendanceService';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: ''
  });
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'attendance'>('transactions');
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();

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

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendanceHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

      // Fetch first page with limit=50
      const transactionsResponse = await fetch(`/api/transactions?limit=50&page=1`, { headers });

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
        setCurrentPage(transactionsData.pagination?.currentPage || 1);
        setHasNextPage(Boolean(transactionsData.pagination?.hasNext));
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

  const loadMore = async () => {
    try {
      if (loadingMore || !hasNextPage) return;

      setLoadingMore(true);

      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const nextPage = currentPage + 1;
      const response = await fetch(`/api/transactions?limit=50&page=${nextPage}`, { headers });
      if (response.ok) {
        const data = await response.json();
        const incoming: Transaction[] = (data.transactions || []) as Transaction[];
        setTransactions(prev => {
          const existingIds = new Set(prev.map(t => t._id));
          const uniqueIncoming = incoming.filter(t => !existingIds.has(t._id));
          // Also guard against duplicates inside the incoming page itself
          const seen = new Set<string>();
          const dedupIncoming = uniqueIncoming.filter(t => {
            if (seen.has(t._id)) return false;
            seen.add(t._id);
            return true;
          });
          return [...prev, ...dedupIncoming];
        });
        setCurrentPage(data.pagination?.currentPage || nextPage);
        setHasNextPage(Boolean(data.pagination?.hasNext));
      }
    } catch (error) {
      console.error('Load more transactions error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const target = e.currentTarget;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 40;
    if (nearBottom) {
      loadMore();
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      setAttendanceLoading(true);
      setAttendanceError('');

      // Get last 7 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const history = await AttendanceService.getAttendanceHistory(startDate, endDate);
      setAttendanceHistory(history);
    } catch (error) {
      console.error('Failed to load attendance history:', error);
      setAttendanceError('Không thể tải lịch sử chấm công');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setLocationLoading(true);
      setAttendanceError('');

      const position = await AttendanceService.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      await AttendanceService.checkIn({ latitude, longitude });

      // Reload attendance history
      await loadAttendanceHistory();
    } catch (error) {
      console.error('Check-in error:', error);
      setAttendanceError(error instanceof Error ? error.message : 'Không thể check-in. Vui lòng kiểm tra quyền truy cập vị trí.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLocationLoading(true);
      setAttendanceError('');

      const position = await AttendanceService.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      await AttendanceService.checkOut({ latitude, longitude });

      // Reload attendance history
      await loadAttendanceHistory();
    } catch (error) {
      console.error('Check-out error:', error);
      setAttendanceError(error instanceof Error ? error.message : 'Không thể check-out. Vui lòng kiểm tra quyền truy cập vị trí.');
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
    return new Date(date).toLocaleString('vi-VN');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 md:pl-72">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 md:hidden"
              >
                <Menu className="h-6 w-6 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                {activeTab === 'transactions' ? 'Giao dịch ngân hàng' : 'Chấm công nhân viên'}
              </h1>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('vi-VN')}
              </div>
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

              <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto" onScroll={handleScroll}>
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
                {loadingMore && (
                  <div className="py-4 text-center text-xs text-gray-500">Đang tải thêm...</div>
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
                        attendanceHistory.map((record) => (
                          <tr key={record._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.checkIn ? new Date(record.checkIn.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.checkOut ? new Date(record.checkOut.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.totalHours || '--:--'}
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
