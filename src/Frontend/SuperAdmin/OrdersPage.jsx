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
  }, [statusFilter, orders]);

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
    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Pending' },
      processing: { class: 'bg-blue-50 text-blue-700 border-blue-100', label: 'Processing' },
      completed: { class: 'bg-green-50 text-green-700 border-green-100', label: 'Completed' },
      cancelled: { class: 'bg-red-50 text-red-600 border-red-100', label: 'Cancelled' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`text-[11px] border rounded-full px-2.5 py-0.5 font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus) => {
    return paymentStatus === 'paid' ? (
      <span className="text-[11px] bg-green-50 text-green-700 border border-green-100 rounded-full px-2.5 py-0.5 font-medium">
        Paid
      </span>
    ) : (
      <span className="text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2.5 py-0.5 font-medium">
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
        showToast({ message: 'Order completed! (Payment already recorded at signup)', type: 'success' });
      } else {
        showToast({ message: `Order completed! Payment recorded: ₱${data.amount_paid.toLocaleString()}`, type: 'success' });
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

  const handleViewDetails = (order) => {
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

  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <div className="flex-1 min-w-0 p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Partner Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage and process partner orders</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-base font-semibold text-gray-900">{orders.filter(o => o.status === 'pending').length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
            <p className="text-xs text-gray-500">Processing</p>
            <p className="text-base font-semibold text-blue-600">{orders.filter(o => o.status === 'processing').length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-base font-semibold text-green-700">{orders.filter(o => o.status === 'completed').length}</p>
          </div>
        </div>

        <div className="bg-gray-100 border border-gray-200 rounded-lg p-1 w-fit mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="ml-2 text-xs text-gray-400">Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl text-center py-12">
            <p className="text-xs font-medium text-gray-500">No orders found</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {statusFilter !== 'all' ? 'Try adjusting your filter' : 'Orders will appear here when partners create them'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-medium text-gray-900">{order.order_number}</p>
                      <span className="text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                        {order.order_type === 'initial_package' ? 'Initial' : 'Reorder'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-700">{order.gym_name}</p>
                    <p className="text-xs text-gray-400">{order.admin_name}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="space-y-1.5 mb-3 pb-3 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Amount</span>
                    <span className="text-xs font-medium text-gray-900">₱{order.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Payment</span>
                    {getPaymentBadge(order.payment_status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Date</span>
                    <span className="text-xs text-gray-500">{formatDate(order.order_date)}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1.5">Items ({order.items?.length || 0})</p>
                  <div className="space-y-1">
                    {order.items?.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-xs text-gray-700 truncate">{item.item_name}</span>
                        <span className="text-xs text-gray-400 ml-2">{item.allocated_quantity}/{item.quantity}</span>
                      </div>
                    ))}
                    {order.items?.length > 2 && (
                      <p className="text-xs text-gray-400">+{order.items.length - 2} more</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5 mt-auto pt-2.5 border-t border-gray-100">
                  <button
                    onClick={() => handleViewDetails(order)}
                    className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                  >
                    View
                  </button>

                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleProcessOrder(order.id)}
                        disabled={processingOrderId === order.id}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {processingOrderId === order.id ? 'Processing...' : 'Process'}
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="bg-white text-red-500 border border-red-100 hover:bg-red-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {order.status === 'processing' && (
                    <>
                      <button
                        onClick={() => handleOpenCompleteModal(order)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="bg-white text-red-500 border border-red-100 hover:bg-red-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
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
      </div>
    </div>
  );
};

export default OrdersPage;