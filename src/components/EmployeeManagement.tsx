'use client';

import React, { useState, useEffect } from 'react';
import { Eye, Plus, Save, X, Edit, Trash2 } from 'lucide-react';

interface Employee {
    id: string;
    name: string;
    username: string;
    email?: string;
    role: 'admin' | 'staff';
    hourlyRate?: number;
    createdAt?: string;
    updatedAt?: string;
}

interface EmployeeManagementProps {
    isAdmin: boolean;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ isAdmin }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingSalary, setEditingSalary] = useState<{ userId: string; rate: number } | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        email: '',
        role: 'staff' as 'admin' | 'staff',
        hourlyRate: 0
    });

    // Load employees data
    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('https://worktime-dux3.onrender.com/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Employees API response:', data);
                if (data.success) {
                    const employeesList = data.data?.users || data.users || [];
                    console.log('Employees list:', employeesList);
                    setEmployees(employeesList);
                }
            }
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setFormData({
            name: employee.name,
            username: employee.username,
            password: '', // Don't show password in view mode
            email: employee.email || '',
            role: employee.role,
            hourlyRate: employee.hourlyRate || 0
        });
        setIsEditing(false);
        setShowViewModal(true);
    };

    const handleEditEmployee = () => {
        setIsEditing(true);
    };

    const handleSaveEmployee = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token || !selectedEmployee) return;

            // Prepare update data (exclude password if empty)
            const updateData: {
                name: string;
                email: string;
                role: 'admin' | 'staff';
                password?: string;
            } = {
                name: formData.name,
                email: formData.email,
                role: formData.role
            };

            if (formData.password.trim()) {
                updateData.password = formData.password;
            }

            // Update user info
            const response = await fetch(`https://worktime-dux3.onrender.com/api/users/${selectedEmployee.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update salary if changed
                    if (formData.hourlyRate !== (selectedEmployee.hourlyRate || 0)) {
                        await handleUpdateSalary(selectedEmployee.id, formData.hourlyRate);
                    }

                    // Update local state
                    setEmployees(prev => prev.map(emp =>
                        emp.id === selectedEmployee.id
                            ? { ...emp, ...updateData, hourlyRate: formData.hourlyRate }
                            : emp
                    ));
                    setIsEditing(false);
                    alert('Cập nhật thành công!');
                }
            }
        } catch (error) {
            console.error('Error updating employee:', error);
            alert('Có lỗi xảy ra khi cập nhật!');
        }
    };

    const handleUpdateSalary = async (userId: string, newRate: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(
                `https://worktime-dux3.onrender.com/api/salary/rate/${userId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ hourlyRate: newRate })
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Reload employees to get updated rates
                    await loadEmployees();
                    setEditingSalary(null);
                    alert('Cập nhật mức lương thành công!');
                } else {
                    alert(data.message || 'Có lỗi xảy ra khi cập nhật mức lương!');
                }
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Có lỗi xảy ra khi cập nhật mức lương!');
            }
        } catch (error) {
            console.error('Error updating salary:', error);
            alert('Có lỗi xảy ra khi cập nhật mức lương!');
        }
    };

    const handleAddEmployee = () => {
        setFormData({
            name: '',
            username: '',
            password: '',
            email: '',
            role: 'staff',
            hourlyRate: 0
        });
        setShowAddModal(true);
    };

    const handleSaveNewEmployee = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Prepare user data without hourlyRate for user creation
            const { hourlyRate, ...userData } = formData;

            const response = await fetch('https://worktime-dux3.onrender.com/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const newUser = data.data?.user || data.user;

                    // Set salary if provided
                    if (hourlyRate > 0) {
                        await handleUpdateSalary(newUser._id || newUser.id, hourlyRate);
                    }

                    setEmployees(prev => [...prev, { ...newUser, hourlyRate }]);
                    setShowAddModal(false);
                    alert('Thêm nhân viên thành công!');
                }
            }
        } catch (error) {
            console.error('Error adding employee:', error);
            alert('Có lỗi xảy ra khi thêm nhân viên!');
        }
    };

    const handleDeleteEmployee = async (employeeId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`https://worktime-dux3.onrender.com/api/users/${employeeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
                if (selectedEmployee?.id === employeeId) {
                    setShowViewModal(false);
                }
                alert('Xóa nhân viên thành công!');
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert('Có lỗi xảy ra khi xóa nhân viên!');
        }
    };

    if (!isAdmin) {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center">
                <p className="text-red-600">Bạn không có quyền truy cập trang này!</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center">
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">Quản lý nhân viên</h2>
                        <p className="text-sm sm:text-base text-gray-600">Quản lý thông tin và quyền hạn của nhân viên</p>
                    </div>
                    <button
                        onClick={handleAddEmployee}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4" />
                        Thêm nhân viên
                    </button>
                </div>
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tên nhân viên
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Username
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Vai trò
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mức lương/giờ
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employees.map((employee, index) => (
                                <tr key={employee.id || `employee-${index}`} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {employee.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {employee.username}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {employee.email || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.role === 'admin'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-green-100 text-green-800'
                                            }`}>
                                            {employee.role === 'admin' ? 'Admin' : 'Staff'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {editingSalary?.userId === employee.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editingSalary.rate}
                                                    onChange={(e) => setEditingSalary(prev =>
                                                        prev ? { ...prev, rate: parseFloat(e.target.value) || 0 } : null
                                                    )}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                    min="0"
                                                    step="1000"
                                                />
                                                <button
                                                    onClick={() => handleUpdateSalary(employee.id, editingSalary.rate)}
                                                    className="bg-green-50 hover:bg-green-100 text-green-700 p-2 rounded-md transition-colors"
                                                    title="Lưu"
                                                >
                                                    <Save className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingSalary(null)}
                                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-md transition-colors"
                                                    title="Hủy"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-900">
                                                    {employee.hourlyRate ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(employee.hourlyRate) : 'Chưa thiết lập'}
                                                </span>
                                                <button
                                                    onClick={() => setEditingSalary({ userId: employee.id, rate: employee.hourlyRate || 0 })}
                                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-md transition-colors"
                                                    title="Chỉnh sửa lương"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleViewEmployee(employee)}
                                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-md transition-colors"
                                                title="Xem thông tin"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => employee.id && handleDeleteEmployee(employee.id)}
                                                className="bg-red-50 hover:bg-red-100 text-red-700 p-2 rounded-md transition-colors"
                                                title="Xóa nhân viên"
                                                disabled={!employee.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                    <div className="p-4 space-y-4">
                        {employees.map((employee, index) => (
                            <div key={employee.id || `employee-${index}`} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">{employee.name}</h3>
                                        <p className="text-xs text-gray-500">{employee.username}</p>
                                    </div>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.role === 'admin'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-green-100 text-green-800'
                                        }`}>
                                        {employee.role === 'admin' ? 'Admin' : 'Staff'}
                                    </span>
                                </div>

                                <div className="mb-3">
                                    <p className="text-xs text-gray-600">
                                        {employee.hourlyRate ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(employee.hourlyRate) : 'Chưa thiết lập lương'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleViewEmployee(employee)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Eye className="h-3 w-3" />
                                        Xem
                                    </button>
                                    <button
                                        onClick={() => employee.id && handleDeleteEmployee(employee.id)}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                        disabled={!employee.id}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* View/Edit Employee Modal */}
            {showViewModal && selectedEmployee && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-gray-200 relative z-10">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {isEditing ? 'Chỉnh sửa nhân viên' : 'Thông tin nhân viên'}
                            </h3>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên nhân viên
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    disabled={!isEditing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                    disabled={!isEditing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    disabled={!isEditing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    disabled={!isEditing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Vai trò
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'staff' }))}
                                    disabled={!isEditing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                >
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mức lương/giờ (VND)
                                </label>
                                <input
                                    type="number"
                                    value={formData.hourlyRate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                                    disabled={!isEditing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    min="0"
                                    step="1000"
                                />
                                {!isEditing && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formData.hourlyRate > 0
                                            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.hourlyRate)
                                            : 'Chưa thiết lập'
                                        }
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t">
                            {!isEditing ? (
                                <button
                                    onClick={handleEditEmployee}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                                >
                                    <Edit className="h-4 w-4" />
                                    Chỉnh sửa
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveEmployee}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                                >
                                    <Save className="h-4 w-4" />
                                    Lưu
                                </button>
                            )}
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Employee Modal */}
            {showAddModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-gray-200 relative z-10">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Thêm nhân viên mới</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên nhân viên *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Username *
                                </label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password *
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Vai trò
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'staff' }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mức lương/giờ (VND) *
                                </label>
                                <input
                                    type="number"
                                    value={formData.hourlyRate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                    step="1000"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t">
                            <button
                                onClick={handleSaveNewEmployee}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                            >
                                <Save className="h-4 w-4" />
                                Lưu
                            </button>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;
