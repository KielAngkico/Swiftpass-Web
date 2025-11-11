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
  const [completingOrder, setCompletingOrder] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_method: 'Cash',
    reference_number: ''
  });

  const { showToast, showConfirm } = useToast();

  useEffect(() => {
    fetchOrders();
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
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };
    const c = config[status] || config.pending;
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
  };

  const getPaymentBadge = (paymentStatus) => {
    return paymentStatus === 'paid' ? (
      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Paid</span>
    ) : (
      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Unpaid</span>
    );
  };

  const handleProcessOrder = async (orderId) => {
    showConfirm(
      'Process this order? This will allocate inventory.',
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

  const handleOpenCompleteModal = (order) => {
    setSelectedOrder(order);
    setPaymentData({
      payment_method: 'Cash',
      reference_number: ''
    });
    setShowPaymentModal(true);
  };

  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;

    if (selectedOrder.order_type !== 'initial_package') {
      if (!paymentData.payment_method) {
        showToast({ message: 'Please select a payment method', type: 'error' });
        return;
      }
      if (paymentData.payment_method !== 'Cash' && !paymentData.reference_number.trim()) {
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
      'Cancel this order? Allocated inventory will be released.',
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
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Partner Orders</h1>
            <p className="text-gray-600 mt-1">Manage partner orders and inventory allocation</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
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
                  placeholder="Search by gym, order number..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
                <p className="text-sm text-gray-600 mt-1">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{orders.filter(o => o.status === 'processing').length}</p>
                <p className="text-sm text-gray-600 mt-1">Processing</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{orders.filter(o => o.status === 'completed').length}</p>
                <p className="text-sm text-gray-600 mt-1">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</p>
                <p className="text-sm text-gray-600 mt-1">Cancelled</p>
              </div>
            </div>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">Loading orders...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredOrders.map(order => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {order.order_type === 'initial_package' ? 'Initial Package' : 'Reorder'}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{order.gym_name} • {order.admin_name}</p>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(order.order_date)}</p>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(order.status)}
                      {getPaymentBadge(order.payment_status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 mb-4 pb-4 border-b">
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-xl font-bold text-gray-900">₱{order.total_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Items</p>
                      <p className="text-xl font-bold text-gray-900">{order.items.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completion</p>
                      <p className="text-xl font-bold text-blue-600">
                        {Math.round((order.items.reduce((sum, i) => sum + i.allocated_quantity, 0) / 
                         order.items.reduce((sum, i) => sum + i.quantity, 0)) * 100)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                    >
                      View Details
                    </button>

                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleProcessOrder(order.id)}
                          disabled={processingOrderId === order.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-medium flex items-center gap-2"
                        >
                          {processingOrderId === order.id ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              Processing...
                            </>
                          ) : (
                            'Process Order'
                          )}
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {order.status === 'processing' && (
                      <>
                        <button
                          onClick={() => handleOpenCompleteModal(order)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                          Complete Order
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Modal */}
          {showPaymentModal && selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-md">
                <div className="bg-green-600 px-6 py-4 rounded-t-lg">
                  <h2 className="text-xl font-bold text-white">Complete Order</h2>
                  <p className="text-green-100 text-sm">{selectedOrder.order_number}</p>
                </div>

                <div className="p-6">
                  {selectedOrder.order_type === 'initial_package' ? (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900 font-medium mb-2">Initial Package Order</p>
                      <p className="text-sm text-blue-700">
                        Payment was already recorded when this partner signed up. 
                        Click "Complete Order" to finalize.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          required
                        >
                          <option value="Cash">Cash</option>
                          <option value="GCash">GCash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Credit Card">Credit Card</option>
                        </select>
                      </div>

                      {paymentData.payment_method !== 'Cash' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reference Number *
                          </label>
                          <input
                            type="text"
                            value={paymentData.reference_number}
                            onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                            placeholder="Enter transaction reference"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
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
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ✖
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Status</p>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Payment</p>
                      {getPaymentBadge(selectedOrder.payment_status)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Order Type</p>
                      <p className="font-medium">
                        {selectedOrder.order_type === 'initial_package' ? 'Initial Package' : 'Reorder'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total</p>
                      <p className="text-lg font-bold">₱{selectedOrder.total_amount.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-gray-900">{item.item_name}</p>
                            <p className="text-xs text-gray-500">₱{item.unit_price.toLocaleString()} each</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {item.allocated_quantity}/{item.quantity}
                            </p>
                            <p className="text-xs text-gray-500">₱{item.subtotal.toLocaleString()}</p>
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
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;