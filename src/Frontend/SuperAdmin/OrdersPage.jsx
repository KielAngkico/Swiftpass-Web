import React, { useState, useEffect } from 'react';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import { useToast } from '../../components/ToastManager';
import PaymentModal from '../../components/Modals/paymentModal';
import OrderDetailsModal from '../../components/Modals/orderdetailsModal';
import api from '../../api';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [paymentData, setPaymentData] = useState({
    payment_method: '',
    reference_number: ''
  });
  const [completingOrder, setCompletingOrder] = useState(false);
  
  const { showToast, showConfirm } = useToast();

  useEffect(() => {
    fetchOrders();
    fetchPaymentOptions();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [statusFilter, searchTerm, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/partner-orders/all');
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showToast({ message: 'Failed to fetch orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentOptions = async () => {
    try {
      const { data } = await api.get('/api/partner-orders/payment-options');
      setPaymentOptions(data);
      if (data.length > 0) {
        setPaymentData(prev => ({ 
          ...prev, 
          payment_method: data.find(opt => opt.is_default)?.payment_method || data[0].payment_method 
        }));
      }
    } catch (error) {
      console.error('Error fetching payment options:', error);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.gym_name?.toLowerCase().includes(term) ||
        order.order_number?.toLowerCase().includes(term) ||
        order.admin_name?.toLowerCase().includes(term)
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-700', label: 'Processing' },
      delivering: { color: 'bg-purple-100 text-purple-700', label: 'Delivering' },
      received: { color: 'bg-orange-100 text-orange-700', label: 'Received' },
      completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus) => {
    return paymentStatus === 'paid' ? (
      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
        Paid
      </span>
    ) : (
      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
        Unpaid
      </span>
    );
  };

  const handleProcessOrder = async (orderId) => {
    showConfirm(
      'Process this order? This will automatically allocate RFIDs from stock.',
      async () => {
        try {
          setProcessingOrderId(orderId);
          await api.put(`/api/partner-orders/${orderId}/process`);
          showToast({ message: 'Order processed successfully!', type: 'success' });
          fetchOrders();
        } catch (error) {
          console.error('Process order error:', error);
          showToast({ 
            message: error.response?.data?.error || 'Failed to process order', 
            type: 'error' 
          });
        } finally {
          setProcessingOrderId(null);
        }
      }
    );
  };

  const handleShipOrder = async (orderId) => {
    showConfirm(
      'Mark this order as delivering?',
      async () => {
        try {
          await api.put(`/api/partner-orders/${orderId}/ship`);
          showToast({ message: 'Order marked as delivering!', type: 'success' });
          fetchOrders();
        } catch (error) {
          showToast({ 
            message: error.response?.data?.error || 'Failed to ship order', 
            type: 'error' 
          });
        }
      }
    );
  };

  const handleOpenCompleteModal = (order) => {
    setSelectedOrder(order);
    setPaymentData({
      payment_method: paymentOptions.find(opt => opt.is_default)?.payment_method || paymentOptions[0]?.payment_method || '',
      reference_number: ''
    });
    setShowPaymentModal(true);
  };

  const handleCompleteOrder = async (e) => {
    e.preventDefault();
    
    if (!selectedOrder) return;

    if (selectedOrder.order_type !== 'initial_package') {
      if (!paymentData.payment_method) {
        showToast({ message: 'Please select a payment method', type: 'error' });
        return;
      }

      if (paymentData.payment_method.toLowerCase() !== 'cash' && !paymentData.reference_number.trim()) {
        showToast({ message: 'Reference number is required for non-cash payments', type: 'error' });
        return;
      }
    }

    try {
      setCompletingOrder(true);
      
      const { data } = await api.put(
        `/api/partner-orders/${selectedOrder.id}/complete-with-payment`,
        paymentData
      );

      if (data.skipped_payment) {
        showToast({ 
          message: 'Order completed! (Payment already recorded at signup)', 
          type: 'success' 
        });
      } else {
        showToast({ 
          message: `Order completed! Payment recorded: ₱${data.amount_paid.toLocaleString()}`, 
          type: 'success' 
        });
      }

      setShowPaymentModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Complete order error:', error);
      showToast({ 
        message: error.response?.data?.error || 'Failed to complete order', 
        type: 'error' 
      });
    } finally {
      setCompletingOrder(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    showConfirm(
      'Cancel this order? Allocated RFIDs will be released back to stock.',
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

  return (
    <div className="flex min-h-screen">
      <SuperAdminSidebar />
      
      <main className="flex-1 bg-white p-2">
        <div className="mb-3">
          <h1 className="text-lg sm:text-xl font-semibold">Partner Orders</h1>
          <p className="text-xs text-gray-500">Manage and process partner orders</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-2 rounded shadow-sm mb-3">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-gray-600">Filter:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="delivering">Delivering</option>
              <option value="received">Received</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by gym, order number..."
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
            />
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{orders.filter(o => o.status === 'processing').length}</p>
              <p className="text-xs text-gray-600">Processing</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-purple-600">{orders.filter(o => o.status === 'delivering').length}</p>
              <p className="text-xs text-gray-600">Delivering</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-orange-600">{orders.filter(o => o.status === 'received').length}</p>
              <p className="text-xs text-gray-600">Received</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{orders.filter(o => o.status === 'completed').length}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</p>
              <p className="text-xs text-gray-600">Cancelled</p>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded shadow overflow-hidden">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto text-xs">
            <table className="min-w-full text-left">
              <thead className="bg-gray-700 text-white uppercase text-xs sticky top-0">
                <tr>
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Order No.</th>
                  <th className="px-2 py-1">Gym</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Amount</th>
                  <th className="px-2 py-1">Payment</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                        <span className="text-gray-600">Loading orders...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, i) => (
                    <tr key={order.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-2 py-2">{i + 1}</td>
                      <td className="px-2 py-2 font-mono font-medium">{order.order_number}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{order.gym_name}</div>
                        <div className="text-xs text-gray-500">{order.admin_name}</div>
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {order.order_type === 'initial_package' ? 'Initial' : 'Reorder'}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-semibold">₱{order.total_amount.toLocaleString()}</td>
                      <td className="px-2 py-2">{getPaymentBadge(order.payment_status)}</td>
                      <td className="px-2 py-2">{getStatusBadge(order.status)}</td>
                      <td className="px-2 py-2 text-xs">{formatDate(order.order_date)}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs"
                            title="View Details"
                          >
                            View
                          </button>

                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleProcessOrder(order.id)}
                              disabled={processingOrderId === order.id}
                              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 text-xs"
                              title="Process Order"
                            >
                              {processingOrderId === order.id ? '...' : 'Process'}
                            </button>
                          )}

                          {order.status === 'processing' && (
                            <button
                              onClick={() => handleShipOrder(order.id)}
                              className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
                              title="Ship Order"
                            >
                              Ship
                            </button>
                          )}

                          {order.status === 'received' && (
                            <button
                              onClick={() => handleOpenCompleteModal(order)}
                              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                              title="Complete Order"
                            >
                              Complete
                            </button>
                          )}

                          {(order.status === 'pending' || order.status === 'processing') && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs"
                              title="Cancel Order"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && selectedOrder && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
              <div className="border-b px-4 py-3">
                <h2 className="text-lg font-semibold">Complete Order</h2>
                <p className="text-xs text-gray-500">{selectedOrder.order_number}</p>
              </div>

              <div className="p-4">
                {selectedOrder.order_type === 'initial_package' ? (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <p className="font-medium text-blue-900 mb-1">Initial Package Order</p>
                    <p className="text-xs text-blue-700">
                      Payment was already recorded at signup. Click "Complete" to finalize.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Partner:</span>
                        <span className="text-sm font-medium">{selectedOrder.gym_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Amount:</span>
                        <span className="text-xl font-bold text-green-600">
                          ₱{selectedOrder.total_amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method *
                      </label>
                      <select
                        value={paymentData.payment_method}
                        onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      >
                        <option value="">Select payment method</option>
                        {paymentOptions.map((option) => (
                          <option key={option.id} value={option.payment_method}>
                            {option.payment_method}
                          </option>
                        ))}
                      </select>
                    </div>

                    {paymentData.payment_method && paymentData.payment_method.toLowerCase() !== 'cash' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reference Number *
                        </label>
                        <input
                          type="text"
                          value={paymentData.reference_number}
                          onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                          placeholder="Enter reference number"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    )}

                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      Make sure you've received the payment before completing.
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm"
                    disabled={completingOrder}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteOrder}
                    disabled={completingOrder}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:bg-green-400"
                  >
                    {completingOrder ? 'Completing...' : 'Complete Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">{selectedOrder.order_number}</h2>
                  <p className="text-xs text-gray-500">{selectedOrder.gym_name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedOrder(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payment</p>
                    {getPaymentBadge(selectedOrder.payment_status)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <p className="font-medium">{selectedOrder.order_type === 'initial_package' ? 'Initial Package' : 'Reorder'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total</p>
                    <p className="font-bold">₱{selectedOrder.total_amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h3 className="font-semibold text-sm mb-2">Timeline</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ordered:</span>
                      <span>{formatDate(selectedOrder.order_date)}</span>
                    </div>
                    {selectedOrder.processed_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Processed:</span>
                        <span>{formatDate(selectedOrder.processed_at)}</span>
                      </div>
                    )}
                    {selectedOrder.shipped_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipped:</span>
                        <span>{formatDate(selectedOrder.shipped_at)}</span>
                      </div>
                    )}
                    {selectedOrder.completed_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span>{formatDate(selectedOrder.completed_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h3 className="font-semibold text-sm mb-2">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-xs text-gray-500">₱{item.unit_price.toLocaleString()} each</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{item.allocated_quantity}/{item.quantity}</p>
                          <p className="text-xs text-gray-500">₱{item.subtotal.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersPage;