'use client';

import { useState, useEffect } from 'react';
import { LogOut, CreditCard, RefreshCw, Search, Calendar, X, Filter } from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

interface Transaction {
  _id: string;
  // Email metadata
  emailId: string;
  emailSubject: string;
  emailDate: string;
  emailSender: string;

  // Transaction details
  transactionId?: string;
  amount: number;
  currency: string;
  transactionType: 'INCOMING' | 'OUTGOING' | 'UNKNOWN';
  transactionTime?: string;

  // Sender/Receiver information
  senderName?: string;
  senderAccount?: string;
  senderBank?: string;
  receiverName?: string;
  receiverAccount?: string;

  // Transaction details
  description?: string;
  fee: number;
  balance?: number;
  transactionCategory?: string;

  // Bank information
  bankName: string;

  // Processing metadata
  parsedSuccessfully: boolean;
  parseError?: string;

  // Status tracking
  status: string;

  // Additional metadata
  notes?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface Filters {
  search: string;
  dateFrom: string;
  dateTo: string;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Load all transactions (no limit for filtering)
      const transactionsResponse = await fetch('/api/transactions?limit=1000', {
        headers
      });

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
      } else {
        setError('Không thể tải dữ liệu');
      }
    } catch (error) {
      console.error('Load data error:', error);
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(transaction =>
        transaction.senderName?.toLowerCase().includes(searchLower) ||
        transaction.senderAccount?.toLowerCase().includes(searchLower) ||
        transaction.receiverName?.toLowerCase().includes(searchLower) ||
        transaction.receiverAccount?.toLowerCase().includes(searchLower) ||
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.transactionId?.toLowerCase().includes(searchLower) ||
        transaction.amount.toString().includes(searchLower) ||
        transaction.senderBank?.toLowerCase().includes(searchLower) ||
        transaction.emailSubject?.toLowerCase().includes(searchLower) ||
        transaction.emailSender?.toLowerCase().includes(searchLower) ||
        transaction.transactionCategory?.toLowerCase().includes(searchLower) ||
        transaction.status?.toLowerCase().includes(searchLower) ||
        transaction.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(transaction =>
        new Date(transaction.transactionTime) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(transaction =>
        new Date(transaction.transactionTime) <= endDate
      );
    }



    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.transactionTime).getTime() - new Date(a.transactionTime).getTime());

    setFilteredTransactions(filtered);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('vi-VN');
  };

  const formatDateInput = (date: string) => {
    return new Date(date).toISOString().slice(0, 16);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
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
                onClick={loadData}
                disabled={loading}
                className="px-3 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>

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
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Giao dịch ngân hàng</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Quản lý và theo dõi các giao dịch từ CAKE Bank
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, nội dung, số tiền..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Từ ngày
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Đến ngày
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>

              {/* Clear Filters */}
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Transactions List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Danh sách giao dịch
              </h2>
              <span className="text-sm text-gray-500">
                {filteredTransactions.length} giao dịch
              </span>
            </div>

            <div className="divide-y divide-gray-200 max-h-96 sm:max-h-none overflow-y-auto">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                    onClick={() => openTransactionDetail(transaction)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.transactionType === 'INCOMING'
                            ? `${transaction.senderName || 'Không xác định'}${transaction.senderAccount ? ` - ${transaction.senderAccount}` : ''}${transaction.senderBank ? ` - ${transaction.senderBank}` : ''}`
                            : `${transaction.receiverName || 'Không xác định'}${transaction.receiverAccount ? ` - ${transaction.receiverAccount}` : ''}${transaction.receiverBank ? ` - ${transaction.receiverBank}` : ''}`
                          }
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {transaction.description || 'Không có mô tả'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(transaction.transactionTime || transaction.emailDate)}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            ID: {transaction.transactionId || 'N/A'}
                          </p>
                          {(transaction.transactionCategory || transaction.emailSubject) && (
                            <p className="text-xs text-blue-600 font-medium truncate ml-2">
                              {transaction.transactionCategory || transaction.emailSubject?.replace('[CAKE] ', '')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-base sm:text-lg font-semibold ${transaction.transactionType === 'INCOMING'
                          ? 'text-green-600'
                          : 'text-red-600'
                          }`}>
                          {transaction.transactionType === 'INCOMING' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {transaction.currency || 'VND'}
                        </p>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${transaction.transactionType === 'INCOMING'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {transaction.transactionType === 'INCOMING' ? 'Tiền vào' : 'Tiền ra'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500">
                    {filters.search || filters.dateFrom || filters.dateTo
                      ? 'Không tìm thấy giao dịch nào phù hợp'
                      : 'Không có giao dịch nào'
                    }
                  </p>
                </div>
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
                  <p className={`text-2xl sm:text-3xl font-bold ${selectedTransaction.transactionType === 'INCOMING'
                    ? 'text-green-600'
                    : 'text-red-600'
                    }`}>
                    {selectedTransaction.transactionType === 'INCOMING' ? '+' : '-'}
                    {formatCurrency(selectedTransaction.amount)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedTransaction.currency || 'VND'}
                  </p>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${selectedTransaction.transactionType === 'INCOMING'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {selectedTransaction.transactionType === 'INCOMING' ? 'Tiền vào' : 'Tiền ra'}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã giao dịch
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTransaction.transactionId}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {formatDate(selectedTransaction.transactionTime || selectedTransaction.emailDate)}
                    </p>
                  </div>

                  {(selectedTransaction.transactionCategory || selectedTransaction.emailSubject) && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loại giao dịch
                      </label>
                      <p className="text-sm text-gray-900 bg-blue-50 p-2 rounded font-medium">
                        {selectedTransaction.transactionCategory || selectedTransaction.emailSubject?.replace('[CAKE] ', '')}
                      </p>
                    </div>
                  )}

                  {selectedTransaction.senderName && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên người chuyển
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTransaction.senderName}
                      </p>
                    </div>
                  )}

                  {selectedTransaction.senderAccount && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tài khoản chuyển
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTransaction.senderAccount}
                      </p>
                    </div>
                  )}

                  {selectedTransaction.senderBank && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ngân hàng chuyển
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTransaction.senderBank}
                      </p>
                    </div>
                  )}

                  {selectedTransaction.receiverName && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tài khoản nhận
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTransaction.receiverName}
                      </p>
                    </div>
                  )}

                  {selectedTransaction.receiverAccount && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Số tài khoản nhận
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTransaction.receiverAccount}
                      </p>
                    </div>
                  )}

                  {selectedTransaction.receiverBank && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ngân hàng nhận
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTransaction.receiverBank}
                      </p>
                    </div>
                  )}

                  {selectedTransaction.fee !== undefined && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phí giao dịch
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTransaction.fee === 0 ? '0 ₫' : formatCurrency(selectedTransaction.fee)}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trạng thái
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTransaction.status}
                    </p>
                  </div>

                  {selectedTransaction.balance && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Số dư
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {formatCurrency(selectedTransaction.balance)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedTransaction.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nội dung chuyển khoản
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedTransaction.description}
                    </p>
                  </div>
                )}

                {/* Reference */}
                {selectedTransaction.reference && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tham chiếu
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedTransaction.reference}
                    </p>
                  </div>
                )}
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
