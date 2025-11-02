import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  Clock,
  Eye,
  Filter,
  Plus,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OwnerSidebar from '../../components/OwnerSidebar';
import { useToast } from '../../components/ToastManager';
import api from '../../api';

const MyOrders = () => {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allocatedRfids, setAllocatedRfids] = useState(null);
  
  // Create order form state
  const [orderItems, setOrderItems] = useState([
    { item_name: '', item_type: 'member_rfid', quantity: 1, unit_price: 0 }
  ]);
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [notes, setNotes] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  
  const navigate = useNavigate();
  const { showToast, showConfirm } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/api/me');
        if (!data?.authenticated || !data?.user) throw new Error('Not authenticated');
        setUser(data.user);
      } catch {
        navigate('/login');
      }
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (user?.id || user?.adminId) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [statusFilter, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const adminId = user.adminId || user.id;
      const { data } = await api.get(`/api/partner-orders/partner/${adminId}`);
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showToast({ message: 'Failed to fetch orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
        icon: Clock,
        label: 'Pending' 
      },
      processing: { 
        color: 'bg-blue-100 text-blue-800 border-blue-300', 
        icon: Package,
        label: 'Processing' 
      },
      delivering: { 
        color: 'bg-purple-100 text-purple-800 border-purple-300', 
        icon: Truck,
        label: 'Delivering' 
      },
      completed: { 
        color: 'bg-green-100 text-green-800 border-green-300', 
        icon: CheckCircle,
        label: 'Completed' 
      },
      cancelled: { 
        color: 'bg-red-100 text-red-800 border-red-300', 
        icon: XCircle,
        label: 'Cancelled' 
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus) => {
    return paymentStatus === 'paid' ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
        Paid
      </span>
    ) : (
      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
        Unpaid
      </span>
    );
  };

  const handleCompleteOrder = async (orderId) => {
    showConfirm(
      'Confirm that you have received this order?',
      async () => {
        try {
          await api.put(`/api/partner-orders/${orderId}/complete`);
          showToast({ message: 'Order completed successfully!', type: 'success' });
          fetchOrders();
        } catch (error) {
          showToast({ 
            message: error.response?.data?.error || 'Failed to complete order', 
            type: 'error' 
          });
        }
      }
    );
  };

  const handleCancelOrder = async (orderId) => {
    showConfirm(
      '⚠️ Cancel this order? This action cannot be undone.',
      async () => {
        try {
          await api.put(`/api/partner-orders/${orderId}/cancel`);
          showToast({ message: 'Order cancelled successfully!', type: 'success' });
          fetchOrders();
        } catch (error) {
          showToast({ 
            message: error.response?.data?.error || 'Failed to cancel order', 
            type: 'error' 
          });
        }
      }
    );
  };

  const handleViewDetails = async (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
    
    try {
      const { data } = await api.get(`/api/partner-orders/${order.id}/allocated-rfids`);
      setAllocatedRfids(data);
    } catch (error) {
      console.error('Failed to fetch RFIDs:', error);
      setAllocatedRfids(null);
    }
  };

  const handleAddItem = () => {
    setOrderItems([...orderItems, { 
      item_name: '', 
      item_type: 'member_rfid', 
      quantity: 1, 
      unit_price: 0 
    }]);
  };

  const handleRemoveItem = (index) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...orderItems];
    updated[index][field] = field === 'quantity' || field === 'unit_price' 
      ? parseFloat(value) || 0 
      : value;
    setOrderItems(updated);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    
    // Validation
    const invalidItems = orderItems.filter(item => 
      !item.item_name.trim() || item.quantity <= 0
    );
    
    if (invalidItems.length > 0) {
      showToast({ message: 'Please fill in all item details', type: 'error' });
      return;
    }

    try {
      setCreatingOrder(true);
      const adminId = user.adminId || user.id;
      
      await api.post('/api/partner-orders/create', {
        admin_id: adminId,
        items: orderItems,
        payment_status: paymentStatus,
        notes: notes.trim() || null
      });

      showToast({ message: 'Order created successfully!', type: 'success' });
      setShowCreateModal(false);
      resetCreateForm();
      fetchOrders();
    } catch (error) {
      console.error('Create order error:', error);
      showToast({ 
        message: error.response?.data?.error || 'Failed to create order', 
        type: 'error' 
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const resetCreateForm = () => {
    setOrderItems([{ 
      item_name: '', 
      item_type: 'member_rfid', 
      quantity: 1, 
      unit_price: 0 
    }]);
    setPaymentStatus('unpaid');
    setNotes('');
  };

  const getOrderTypeLabel = (type) => {
    return type === 'initial_package' ? 'Initial Package' : 'Reorder';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const OrderCard = ({ order }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900">{order.order_number}</h3>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {getOrderTypeLabel(order.order_type)}
              </span>
            </div>
            <p className="text-xs text-gray-500">{formatDate(order.order_date)}</p>
          </div>
          {getStatusBadge(order.status)}
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-semibold text-gray-900">₱{order.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Payment:</span>
            {getPaymentBadge(order.payment_status)}
          </div>
          {order.completion_percentage > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Completion:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${order.completion_percentage}%` }}
                  />
                </div>
                <span className="font-medium text-blue-600 text-xs">
                  {order.completion_percentage}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-3 mb-3">
          <p className="text-xs text-gray-500 mb-2">Items ({order.items?.length || 0}):</p>
          <div className="space-y-1">
            {order.items?.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-gray-700">{item.item_name}</span>
                <span className="text-gray-600">
                  {item.allocated_quantity}/{item.quantity}
                </span>
              </div>
            ))}
            {order.items?.length > 2 && (
              <p className="text-xs text-gray-500 italic">
                +{order.items.length - 2} more items
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleViewDetails(order)}
            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 text-xs font-medium flex items-center justify-center gap-1"
          >
            <Eye size={14} />
            View Details
          </button>

          {order.status === 'delivering' && (
            <button
              onClick={() => handleCompleteOrder(order.id)}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-xs font-medium flex items-center justify-center gap-1"
            >
              <CheckCircle size={14} />
              Received
            </button>
          )}

          {order.status === 'pending' && (
            <button
              onClick={() => handleCancelOrder(order.id)}
              className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      
      <main className="flex-1 p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">My Orders</h1>
          <p className="text-gray-600 text-sm">Track and manage your orders</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Create New Order
          </button>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="delivering">Delivering</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white p-4 rounded-lg border text-center">
            <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
          <div className="bg-white p-4 rounded-lg border text-center">
            <p className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'processing').length}</p>
            <p className="text-xs text-gray-600">Processing</p>
          </div>
          <div className="bg-white p-4 rounded-lg border text-center">
            <p className="text-2xl font-bold text-purple-600">{orders.filter(o => o.status === 'delivering').length}</p>
            <p className="text-xs text-gray-600">Delivering</p>
          </div>
          <div className="bg-white p-4 rounded-lg border text-center">
            <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'completed').length}</p>
            <p className="text-xs text-gray-600">Completed</p>
          </div>
          <div className="bg-white p-4 rounded-lg border text-center">
            <p className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</p>
            <p className="text-xs text-gray-600">Cancelled</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Package size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 mb-1">No orders found</p>
            <p className="text-sm text-gray-400 mb-4">
              {statusFilter !== 'all' 
                ? 'Try adjusting your filter' 
                : 'Create your first order to get started'}
            </p>
            {statusFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Create Order
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {/* Create Order Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="p-6">
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900">Order Items</h3>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Item Name *
                            </label>
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                              placeholder="e.g., RFID Cards"
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Item Type
                            </label>
                            <select
                              value={item.item_type}
                              onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            >
                              <option value="member_rfid">Member RFID</option>
                              <option value="partner_rfid">Partner RFID</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Unit Price (₱)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            Subtotal: <span className="font-semibold">₱{(item.quantity * item.unit_price).toLocaleString()}</span>
                          </p>
                          {orderItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Amount
                    </label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-lg font-bold text-gray-900">
                      ₱{calculateTotal().toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special instructions or notes..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingOrder}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400 flex items-center justify-center gap-2"
                  >
                    {creatingOrder ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Creating...
                      </>
                    ) : (
                      'Create Order'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedOrder.order_number}</h2>
                  <p className="text-sm text-gray-600">{formatDate(selectedOrder.order_date)}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedOrder(null);
                    setAllocatedRfids(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payment Status</p>
                    {getPaymentBadge(selectedOrder.payment_status)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Order Type</p>
                    <p className="text-sm font-medium">{getOrderTypeLabel(selectedOrder.order_type)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                    <p className="text-sm font-bold">₱{selectedOrder.total_amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Placed:</span>
                      <span className="text-gray-900">{formatDate(selectedOrder.order_date)}</span>
                    </div>
                    {selectedOrder.processed_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Processed:</span>
                        <span className="text-gray-900">{formatDate(selectedOrder.processed_at)}</span>
                      </div>
                    )}
                    {selectedOrder.shipped_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipped:</span>
                        <span className="text-gray-900">{formatDate(selectedOrder.shipped_at)}</span>
                      </div>
                    )}
                    {selectedOrder.completed_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span className="text-gray-900">{formatDate(selectedOrder.completed_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">{item.item_name}</p>
                          <p className="text-xs text-gray-500">
                            Type: {item.item_type} • Unit Price: ₱{item.unit_price.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {item.allocated_quantity}/{item.quantity}
                          </p>
                          <p className="text-xs text-gray-500">
                            ₱{item.subtotal.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {allocatedRfids && allocatedRfids.total > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Allocated RFIDs ({allocatedRfids.total})
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(allocatedRfids.rfids).map(([role, rfids]) => (
                        <div key={role}>
                          <p className="text-sm font-medium text-gray-700 mb-2">{role} RFIDs:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {rfids.map((rfid) => (
                              <div key={rfid.id} className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                <p className="font-mono font-semibold text-blue-900">{rfid.rfid_tag}</p>
                                <p className="text-gray-600">{rfid.rfid_type}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOrder.notes && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedOrder.notes}</p>
                  </div>
                )}

                {selectedOrder.status === 'delivering' && (
                  <div className="border-t pt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-medium text-blue-900 text-sm mb-1">
                          Order is on the way!
                        </p>
                        <p className="text-blue-700 text-xs mb-3">
                          Please confirm receipt once you receive your order.
                        </p>
                        <button
                          onClick={() => {
                            setShowDetailsModal(false);
                            handleCompleteOrder(selectedOrder.id);
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium flex items-center gap-1"
                        >
                          <CheckCircle size={16} />
                          Confirm Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyOrders;