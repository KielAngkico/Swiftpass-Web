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

        {/* Orders Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
            <span className="ml-2 text-sm text-gray-600">Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded shadow-sm">
            <p className="text-sm text-gray-500">No orders found</p>
            <p className="text-xs text-gray-400 mt-1">
              {statusFilter !== 'all' || searchTerm 
                ? 'Try adjusting your filters' 
                : 'Orders will appear here when partners create them'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded border border-gray-200 shadow-sm p-3">
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-900">{order.order_number}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {order.order_type === 'initial_package' ? 'Initial' : 'Reorder'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-700">{order.gym_name}</p>
                    <p className="text-xs text-gray-500">{order.admin_name}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Info */}
                <div className="space-y-1 mb-2 pb-2 border-b">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">₱{order.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Payment:</span>
                    {getPaymentBadge(order.payment_status)}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Date:</span>
                    <span>{formatDate(order.order_date)}</span>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="mb-2">
                  <p className="text-xs text-gray-500 mb-1">Items ({order.items?.length || 0}):</p>
                  <div className="space-y-1">
                    {order.items?.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-gray-700 truncate">{item.item_name}</span>
                        <span className="text-gray-600 ml-2">
                          {item.allocated_quantity}/{item.quantity}
                        </span>
                      </div>
                    ))}
                    {order.items?.length > 2 && (
                      <p className="text-xs text-gray-500 italic">
                        +{order.items.length - 2} more
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => handleViewDetails(order)}
                    className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 text-xs font-medium"
                  >
                    View
                  </button>

                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleProcessOrder(order.id)}
                      disabled={processingOrderId === order.id}
                      className="flex-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:bg-blue-400 text-xs font-medium"
                    >
                      {processingOrderId === order.id ? '...' : 'Process'}
                    </button>
                  )}

                  {order.status === 'processing' && (
                    <button
                      onClick={() => handleShipOrder(order.id)}
                      className="flex-1 bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 text-xs font-medium"
                    >
                      Ship
                    </button>
                  )}

                  {order.status === 'received' && (
                    <button
                      onClick={() => handleOpenCompleteModal(order)}
                      className="flex-1 bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 text-xs font-medium"
                    >
                      Complete
                    </button>
                  )}

                  {(order.status === 'pending' || order.status === 'processing') && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <PaymentModal
          order={selectedOrder}
          paymentOptions={paymentOptions}
          paymentData={paymentData}
          setPaymentData={setPaymentData}
          onComplete={handleCompleteOrder}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
          }}
          completingOrder={completingOrder}
          show={showPaymentModal}
        />

        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          getStatusBadge={getStatusBadge}
          getPaymentBadge={getPaymentBadge}
          show={showDetailsModal}
        />
      </main>
    </div>
  );
};

export default OrdersPage;