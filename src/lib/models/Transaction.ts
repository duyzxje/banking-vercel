import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Email metadata
  emailId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  emailSubject: {
    type: String,
    required: true
  },
  emailDate: {
    type: Date,
    required: true,
    index: true
  },
  emailSender: {
    type: String,
    required: true
  },
  historyId: {
    type: String,
    index: true
  },

  // Transaction details
  transactionId: {
    type: String,
    sparse: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    index: true
  },
  currency: {
    type: String,
    default: 'VND'
  },
  transactionType: {
    type: String,
    enum: ['INCOMING', 'OUTGOING', 'UNKNOWN'],
    default: 'UNKNOWN',
    index: true
  },

  // Sender/Receiver information
  senderName: {
    type: String,
    trim: true
  },
  senderAccount: {
    type: String,
    trim: true
  },
  senderBank: {
    type: String,
    trim: true
  },
  receiverName: {
    type: String,
    trim: true
  },
  receiverAccount: {
    type: String,
    trim: true
  },

  // Transaction details
  description: {
    type: String,
    trim: true
  },
  transactionTime: {
    type: Date,
    index: true
  },
  fee: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number
  },
  transactionCategory: {
    type: String,
    trim: true
  },

  // Bank information
  bankName: {
    type: String,
    default: 'CAKE',
    index: true
  },

  // Processing metadata
  rawEmailContent: {
    type: String,
    required: false,
    select: false
  },
  parsedSuccessfully: {
    type: Boolean,
    default: false,
    index: true
  },
  parseError: {
    type: String,
    select: false
  },

  // Status tracking
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSED', 'ERROR', 'DUPLICATE', 'SKIPPED'],
    default: 'PENDING',
    index: true
  },

  // Additional metadata
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
transactionSchema.index({ transactionTime: -1 });
transactionSchema.index({ amount: 1, transactionType: 1 });
transactionSchema.index({ senderBank: 1, transactionType: 1 });

export interface ITransaction extends mongoose.Document {
  // Email metadata
  emailId: string;
  emailSubject: string;
  emailDate: Date;
  emailSender: string;
  historyId?: string;

  // Transaction details
  transactionId?: string;
  amount: number;
  currency: string;
  transactionType: 'INCOMING' | 'OUTGOING' | 'UNKNOWN';
  transactionTime?: Date;

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
  rawEmailContent?: string;
  parsedSuccessfully: boolean;
  parseError?: string;

  // Status tracking
  status: 'PENDING' | 'PROCESSED' | 'ERROR' | 'DUPLICATE' | 'SKIPPED';

  // Additional metadata
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema);
