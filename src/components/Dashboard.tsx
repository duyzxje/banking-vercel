'use client';

import { useState, useEffect } from 'react';
import { LogOut, CreditCard, RefreshCw, Search, X } from 'lucide-react';

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

  useEffect(() => {
    loadData();

    // Thiết lập auto-refresh mỗi 30 giây
    const interval = setInterval(() => {
      checkForNewTransactions();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, filters]);

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
        setTransactions(prev => [...prev, ...(data.transactions || [])]);
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
          const latestTransaction = data.transactions[0];
          const latestTransactionTime = new Date(latestTransaction.ngayGioGiaoDich);

          if (lastUpdateTime && latestTransactionTime > lastUpdateTime) {
            // Có giao dịch mới - tải lại trang đầu
            await loadData(false);
          }
        }
      }
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Banking</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Transaction Management</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 p-2 rounded-lg hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline text-sm font-medium">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Giao dịch ngân hàng</h1>
            <div className="flex items-center justify-center space-x-2">
              <p className="text-gray-600 text-sm sm:text-base">
                Quản lý và theo dõi các giao dịch
              </p>
              <div className="flex items-center space-x-1">
              </div>
            </div>
          </div>

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
                        <div className="flex items-center space-x-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${transaction.soTienNumber > 0 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {transaction.tenNguoiChuyen}
                          </p>
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                            {transaction.taiKhoanChuyen}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {transaction.nganHangChuyen}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 truncate mb-2">
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
                    <p className="text-sm text-gray-900 bg-blue-50 p-2 rounded font-medium">
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
