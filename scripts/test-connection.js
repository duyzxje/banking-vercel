const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import Transaction model
const transactionSchema = new mongoose.Schema({
  // Thông tin tài khoản
  taiKhoanNhan: {
    type: String,
    required: true,
    trim: true
  },
  taiKhoanChuyen: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  tenNguoiChuyen: {
    type: String,
    required: true,
    trim: true
  },
  nganHangChuyen: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  // Thông tin giao dịch
  loaiGiaoDich: {
    type: String,
    required: true,
    trim: true
  },
  maGiaoDich: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ngayGioGiaoDich: {
    type: Date,
    required: true,
    index: true
  },

  // Thông tin số tiền
  soTien: {
    type: String,
    required: true,
    trim: true
  },
  soTienNumber: {
    type: Number,
    required: true,
    index: true
  },
  phiGiaoDich: {
    type: String,
    required: true,
    trim: true
  },
  phiGiaoDichNumber: {
    type: Number,
    required: true,
    default: 0
  },

  // Nội dung giao dịch
  noiDungGiaoDich: {
    type: String,
    required: true,
    trim: true
  },

  // Metadata
  emailId: {
    type: String,
    required: true,
    index: true
  },
  historyId: {
    type: String,
    required: true,
    index: true
  },
  processedAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

const Transaction = mongoose.model('Transaction', transactionSchema);

async function testConnection() {
  try {
    console.log('🔄 Đang kết nối tới MongoDB Atlas...');

    await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Kết nối MongoDB Atlas thành công!');

    // Test tạo một giao dịch mẫu
    const sampleTransaction = new Transaction({
      taiKhoanNhan: "0916496246 - Tài khoản thanh toán",
      taiKhoanChuyen: "0916496246",
      tenNguoiChuyen: "MBBANK IBFT",
      nganHangChuyen: "MBB",
      loaiGiaoDich: "Chuyển tiền ngoài CAKE",
      maGiaoDich: "298419059",
      ngayGioGiaoDich: new Date("2025-08-08T20:02:43.000Z"),
      soTien: "+2.000 đ",
      soTienNumber: 2000,
      phiGiaoDich: "0 đ",
      phiGiaoDichNumber: 0,
      noiDungGiaoDich: "LE ANH DUY chuyen tien",
      emailId: "1988b4757c185406",
      historyId: "607057",
      processedAt: new Date("2025-08-08T20:02:52.163Z")
    });

    // Kiểm tra xem giao dịch đã tồn tại chưa
    const existingTransaction = await Transaction.findOne({ maGiaoDich: "298419059" });

    if (!existingTransaction) {
      await sampleTransaction.save();
      console.log('✅ Đã tạo giao dịch mẫu thành công!');
    } else {
      console.log('ℹ️  Giao dịch mẫu đã tồn tại');
    }

    // Lấy danh sách giao dịch
    const transactions = await Transaction.find().limit(5);
    console.log(`📊 Tìm thấy ${transactions.length} giao dịch trong database`);

    transactions.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.tenNguoiChuyen} - ${tx.soTien} - ${tx.maGiaoDich}`);
    });

  } catch (error) {
    console.error('❌ Lỗi kết nối:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB');
  }
}

testConnection();
