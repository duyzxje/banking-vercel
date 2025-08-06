# Banking Transactions Web App

Hệ thống quản lý giao dịch ngân hàng với Next.js và MongoDB Atlas.

## 🚀 Tính năng

- ✅ **Authentication** - JWT với MongoDB
- ✅ **Dashboard** - Thống kê và giao dịch gần đây
- ✅ **API Routes** - Serverless functions
- ✅ **MongoDB Atlas** - Kết nối trực tiếp
- ✅ **Responsive** - Mobile-first design
- ✅ **Tailwind CSS** - Modern styling

## 🔧 Cài đặt

```bash
# Clone repository
git clone <repo-url>
cd banking-vercel

# Cài đặt dependencies
npm install

# Tạo file .env.local
cp .env.example .env.local

# Chạy development server
npm run dev
```

## 🔐 Environment Variables

Tạo file `.env.local`:

```env
MONGODB_URI=mongodb+srv://duyzxje2110:Exactly258@banking.gafjm6p.mongodb.net/banking-notifications?retryWrites=true&w=majority&appName=Banking
JWT_SECRET=banking-secret-key-vercel-2025
```

## 👤 Test Account (Development Only)

**⚠️ CHỈ SỬ DỤNG CHO DEVELOPMENT - KHÔNG DEPLOY VỚI THÔNG TIN NÀY**

```
Username: duyen
Password: giorlin@chuyenkhoan
```

## 🚀 Deploy lên Vercel

1. Push code lên GitHub
2. Import vào Vercel
3. Set Environment Variables
4. Deploy!

## 🛠 Kiến trúc

```
┌─────────────────┐    ┌─────────────────┐
│   Vercel Web    │────│  MongoDB Atlas  │
│   (Next.js)     │    │   (Direct)      │
└─────────────────┘    └─────────────────┘
                              │
┌─────────────────┐    ┌─────────────────┐
│  Android VPS    │────│  MongoDB Atlas  │
│   (Backend)     │    │ (Collect Data)  │
└─────────────────┘    └─────────────────┘
```

## 📁 Cấu trúc thư mục

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   └── transactions/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Dashboard.tsx
│   └── Login.tsx
└── lib/
    └── mongodb.ts
```

## 🔒 Bảo mật

- JWT tokens cho authentication
- Environment variables cho sensitive data
- Không hardcode credentials trong code
- HTTPS only trong production
