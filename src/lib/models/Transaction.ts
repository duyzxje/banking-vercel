import mongoose from 'mongoose';

// Schema cho dữ liệu từ MongoDB Atlas theo cấu trúc mới
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
transactionSchema.index({ ngayGioGiaoDich: -1 });
transactionSchema.index({ soTienNumber: 1, nganHangChuyen: 1 });
transactionSchema.index({ maGiaoDich: 1 });
transactionSchema.index({ taiKhoanChuyen: 1 });

export interface ITransaction extends mongoose.Document {
  // Thông tin tài khoản
  taiKhoanNhan: string;
  taiKhoanChuyen: string;
  tenNguoiChuyen: string;
  nganHangChuyen: string;

  // Thông tin giao dịch
  loaiGiaoDich: string;
  maGiaoDich: string;
  ngayGioGiaoDich: Date;

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
  processedAt: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema);
