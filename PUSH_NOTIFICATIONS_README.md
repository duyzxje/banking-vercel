# Web Push Notifications Integration

## Tổng quan
Hệ thống đã được tích hợp Web Push Notifications để hiển thị thông báo trực tiếp trên điện thoại khi có thông báo mới, ngay cả khi ứng dụng không mở.

## Tính năng đã tích hợp

### 1. Service Worker (`/public/sw.js`)
- Xử lý push events và hiển thị notifications
- Quản lý cache cho offline functionality
- Xử lý notification clicks và actions
- Background sync để kiểm tra thông báo mới

### 2. PushNotificationManager (`src/components/PushNotificationManager.ts`)
- Quản lý VAPID keys và subscription
- Đăng ký/hủy đăng ký push notifications
- Gửi subscription lên server
- Test push notifications
- Fallback cho demo mode

### 3. usePushNotifications Hook (`src/components/usePushNotifications.ts`)
- React hook để sử dụng push notifications
- Quản lý state và permissions
- Cung cấp các actions: subscribe, unsubscribe, test
- Error handling và loading states

### 4. PushNotificationSettings Component (`src/components/PushNotificationSettings.tsx`)
- UI để cài đặt push notifications
- Hiển thị trạng thái permission và subscription
- Buttons để đăng ký/hủy đăng ký
- Test notification functionality
- Hướng dẫn khi permission bị từ chối

### 5. Dashboard Integration
- Tab "Push Notifications" trong admin panel
- Hiển thị trạng thái push notifications
- Tích hợp với notification system hiện có

### 6. PWA Manifest (`/public/manifest.webmanifest`)
- Cấu hình PWA với shortcuts
- Icons và metadata cho app
- Display mode và theme colors

## Cách sử dụng

### Cho Admin:
1. Vào tab "Admin" → "Push Notifications"
2. Kiểm tra trạng thái hỗ trợ trình duyệt
3. Cấp quyền thông báo nếu chưa có
4. Đăng ký push notifications
5. Test thông báo để kiểm tra

### Cho User:
1. Mở ứng dụng trên điện thoại
2. Cho phép thông báo khi được hỏi
3. Nhận thông báo ngay cả khi app không mở

## API Endpoints cần thiết

### Backend cần implement các endpoints sau:

#### 1. VAPID Key
```
GET /api/push/vapid-key
Response: { success: true, publicKey: "..." }
```

#### 2. Subscribe
```
POST /api/push/subscribe
Body: { subscription: {...}, userAgent: "..." }
Response: { success: true, message: "..." }
```

#### 3. Unsubscribe
```
POST /api/push/unsubscribe
Body: { endpoint: "..." }
Response: { success: true, message: "..." }
```

#### 4. Test Push
```
POST /api/push/test
Body: { title: "...", body: "..." }
Response: { success: true, message: "..." }
```

## Demo Mode

Khi API không khả dụng, hệ thống sẽ:
- Sử dụng demo VAPID key
- Hiển thị local notifications thay vì push
- Log các operations thay vì gửi lên server
- Vẫn hoạt động đầy đủ cho demo

## Browser Support

### Được hỗ trợ:
- Chrome/Edge (Android, Desktop)
- Firefox (Android, Desktop)
- Safari (iOS 16.4+, macOS)

### Không được hỗ trợ:
- Safari cũ hơn iOS 16.4
- Một số trình duyệt mobile cũ

## Troubleshooting

### 1. Service Worker không đăng ký
- Kiểm tra `/sw.js` có accessible không
- Kiểm tra console errors
- Đảm bảo HTTPS (push notifications cần HTTPS)

### 2. Permission bị từ chối
- Hướng dẫn user vào browser settings
- Cho phép notifications cho domain này
- Refresh trang và thử lại

### 3. Push notifications không hoạt động
- Kiểm tra VAPID keys
- Kiểm tra subscription status
- Kiểm tra backend push service
- Test với local notification trước

### 4. Demo mode không hoạt động
- Kiểm tra Notification API support
- Kiểm tra permission status
- Kiểm tra console errors

## Security Notes

1. **VAPID Keys**: Cần generate và bảo mật VAPID keys
2. **HTTPS**: Push notifications chỉ hoạt động trên HTTPS
3. **User Consent**: Luôn yêu cầu permission trước khi subscribe
4. **Data Privacy**: Không lưu thông tin nhạy cảm trong push data

## Performance

1. **Service Worker**: Chạy background, không ảnh hưởng UI
2. **Push Events**: Xử lý nhanh, không block main thread
3. **Cache**: Tối ưu cho offline experience
4. **Background Sync**: Chỉ khi cần thiết

## Future Enhancements

1. **Rich Notifications**: Thêm images, actions
2. **Notification History**: Lưu lịch sử notifications
3. **Custom Sounds**: Âm thanh tùy chỉnh
4. **Scheduled Notifications**: Thông báo theo lịch
5. **Notification Analytics**: Thống kê engagement
