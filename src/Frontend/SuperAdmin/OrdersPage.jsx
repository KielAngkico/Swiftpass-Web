import React, { useState, useEffect } from 'react';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import { useToast } from '../../components/ToastManager';
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
  const [allocatedRfids, setAllocatedRfids] = useState(null);
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
      // Set default payment method
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
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
        label: '⏳ Pending' 
      },
      processing: { 
        color: 'bg-blue-100 text-blue-800 border-blue-300', 
        label: '📦 Processing' 
      },
      delivering: { 
        color: 'bg-purple-100 text-purple-800 border-purple-300', 
        label: '🚚 Delivering' 
      },
      received: { 
        color: 'bg-orange-100 text-orange-800 border-orange-300', 
        label: '📬 Received' 
      },
      completed: { 
        color: 'bg-green-100 text-green-800 border-green-300', 
        label: '✅ Completed' 
      },
      cancelled: { 
        color: 'bg-red-100 text-red-800 border-red-300', 
        label: '❌ Cancelled' 
      }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
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

  const handleProcessOrder = async (orderId) => {
    showConfirm(
      'Process this order? This will automatically allocate RFIDs from stock.',
      async () => {
        try {
          setProcessingOrderId(orderId);
          const { data } = await api.put(`/api/partner-orders/${orderId}/process`);
          
          showToast({ 
            message: 'Order processed successfully!', 
            type: 'success' 
          });
          
          if (data.allocation_results) {
            console.log('Allocation Results:', data.allocation_results);
          }
          
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
    
    // Reset payment data
    setPaymentData({
      payment_method: paymentOptions.find(opt => opt.is_default)?.payment_method || paymentOptions[0]?.payment_method || '',
      reference_number: ''
    });
    
    setShowPaymentModal(true);
  };

  const handleCompleteOrder = async (e) => {
    e.preventDefault();
    
    if (!selectedOrder) return;

    // Validate payment data for reorders
    if (selectedOrder.order_type !== 'initial_package') {
      if (!paymentData.payment_method) {
        showToast({ message: 'Please select a payment method', type: 'error' });
        return;
      }

      // Require reference number for non-cash payments
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
          message: `Order completed! Payment recorded: ₱${data.amount_paid.toLocaleString()} via ${data.payment_method}`, 
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
      '⚠️ Cancel this order? Allocated RFIDs will be released back to stock.',
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
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className="font-medium">{order.gym_name}</span>
            </div>
            <p className="text-xs text-gray-500">{order.admin_name}</p>
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
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Order Date:</span>
            <span className="text-gray-700">{formatDate(order.order_date)}</span>
          </div>
          {order.completion_percentage > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Completion:</span>
              <span className="font-medium text-blue-600">{order.completion_percentage}%</span>
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
            View Details
          </button>

          {order.status === 'pending' && (
            <button
              onClick={() => handleProcessOrder(order.id)}
              disabled={processingOrderId === order.id}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 text-xs font-medium flex items-center justify-center gap-1"
            >
              {processingOrderId === order.id ? (
                <>
                  <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                'Process'
              )}
            </button>
          )}

          {order.status === 'processing' && (
            <button
              onClick={() => handleShipOrder(order.id)}
              className="flex-1 bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 text-xs font-medium flex items-center justify-center gap-1"
            >
              Ship
            </button>
          )}

          {order.status === 'received' && (
            <button
              onClick={() => handleOpenCompleteModal(order)}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-xs font-medium flex items-center justify-center gap-1"
            >
              Complete
            </button>
          )}

          {(order.status === 'pending' || order.status === 'processing') && (
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
      <SuperAdminSidebar />
      
      <main className="flex-1 p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Partner Orders</h1>
          <p className="text-gray-600 text-sm">Manage and process partner orders</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="delivering">Delivering</option>
                <option value="received">Received</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by gym name, order number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'processing').length}</p>
              <p className="text-xs text-gray-600">Processing</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{orders.filter(o => o.status === 'delivering').length}</p>
              <p className="text-xs text-gray-600">Delivering</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{orders.filter(o => o.status === 'received').length}</p>
              <p className="text-xs text-gray-600">Received</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'completed').length}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</p>
              <p className="text-xs text-gray-600">Cancelled</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-1">No orders found</p>
            <p className="text-sm text-gray-400">
              {statusFilter !== 'all' || searchTerm 
                ? 'Try adjusting your filters' 
                : 'Orders will appear here when partners create them'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-lg">
                <h2 className="text-xl font-bold text-white">Complete Order</h2>
                <p className="text-green-100 text-sm">{selectedOrder.order_number}</p>
              </div>

              <div className="p-6">
                {selectedOrder.order_type === 'initial_package' ? (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium mb-2">
                      ℹ️ Initial Package Order
                    </p>
                    <p className="text-sm text-blue-700">
                      Payment was already recorded when this partner signed up. 
                      Click "Complete Order" to finalize delivery.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Partner:</span>
                        <span className="font-medium">{selectedOrder.gym_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="text-2xl font-bold text-green-600">
                          ₱{selectedOrder.total_amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method *
                      </label>
                      <select
                        value={paymentData.payment_method}
                        onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reference Number *
                        </label>
                        <input
                          type="text"
                          value={paymentData.reference_number}
                          onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                          placeholder="Enter transaction reference number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Required for {paymentData.payment_method} payments
                        </p>
                      </div>
                    )}

                    <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-800">
                        ⚠️ This will record the payment and mark the order as completed. 
                        Make sure you've received the payment before proceeding.
                      </p>
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    disabled={completingOrder}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteOrder}
                    disabled={completingOrder}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-green-400 flex items-center justify-center gap-2"
                  >
                    {completingOrder ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Completing...
                      </>
                    ) : (
                      'Complete Order'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedOrder.order_number}</h2>
                  <p className="text-sm text-gray-600">{selectedOrder.gym_name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedOrder(null);
                    setAllocatedRfids(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✖
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
                    {selectedOrder.received_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Received:</span>
                        <span className="text-gray-900">{formatDate(selectedOrder.received_at)}</span>
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
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersPage;