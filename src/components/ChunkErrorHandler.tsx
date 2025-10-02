"use client";

import { useEffect } from "react";

export default function ChunkErrorHandler() {
    useEffect(() => {
        // Xử lý ChunkLoadError - tự động reload khi gặp lỗi chunk
        const handleChunkError = (event: ErrorEvent) => {
            const { message, filename } = event;

            // Kiểm tra các dạng lỗi chunk khác nhau
            const isChunkError =
                message?.includes("ChunkLoadError") ||
                message?.includes("Loading chunk") ||
                message?.includes("Loading CSS chunk") ||
                filename?.includes("/_next/static/chunks/");

            if (isChunkError) {
                console.warn("🔄 Phát hiện ChunkLoadError, đang reload trang...", {
                    message,
                    filename,
                    timestamp: new Date().toISOString()
                });

                // Thêm delay nhỏ để tránh reload liên tục
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        };

        // Xử lý Promise rejection (cho dynamic imports)
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason?.toString() || "";

            const isChunkError =
                reason.includes("ChunkLoadError") ||
                reason.includes("Loading chunk") ||
                reason.includes("/_next/static/chunks/");

            if (isChunkError) {
                console.warn("🔄 Phát hiện Promise rejection do chunk error, đang reload...", {
                    reason,
                    timestamp: new Date().toISOString()
                });

                // Ngăn lỗi hiển thị trong console
                event.preventDefault();

                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        };

        // Đăng ký event listeners
        window.addEventListener("error", handleChunkError);
        window.addEventListener("unhandledrejection", handleUnhandledRejection);

        // Cleanup khi component unmount
        return () => {
            window.removeEventListener("error", handleChunkError);
            window.removeEventListener("unhandledrejection", handleUnhandledRejection);
        };
    }, []);

    // Component này không render gì cả, chỉ xử lý logic
    return null;
}
