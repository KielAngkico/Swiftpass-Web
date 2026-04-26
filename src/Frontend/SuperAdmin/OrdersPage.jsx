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

    // Renewals go through /process which saves transaction + extends subscription
    if (selectedOrder.order_type === 'renewal') {
      await api.put(
        `/api/partner-orders/${selectedOrder.id}/process`,
        paymentData
      );
      showToast({ message: 'Renewal processed! Subscription extended.', type: 'success' });
    } else {
      const { data } = await api.put(
        `/api/partner-orders/${selectedOrder.id}/complete-with-payment`,
        paymentData
      );
      if (data.skipped_payment) {
        showToast({ message: 'Order completed! (Payment already recorded at signup)', type: 'success' });
      } else {
        showToast({ message: `Order completed! Payment recorded: ₱${data.amount_paid.toLocaleString()}`, type: 'success' });
      }
    }

    setShowPaymentModal(false);
    setSelectedOrder(null);
    fetchOrders();
  } catch (error) {
    showToast({
      message: error.response?.data?.error || 'Failed to process order',
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

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Partner Orders</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage and process partner orders
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-base font-semibold text-gray-900">
            {orders.filter(o => o.status === 'pending').length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Processing</p>
          <p className="text-base font-semibold text-blue-600">
            {orders.filter(o => o.status === 'processing').length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-base font-semibold text-green-700">
            {orders.filter(o => o.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-1 flex gap-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-xs text-gray-400">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-xs font-medium text-gray-500">No orders found</p>
          <p className="text-xs text-gray-400 mt-1">
            {statusFilter !== "all"
              ? "Try adjusting your filter"
              : "Orders will appear here when partners create them"}
          </p>
        </div>
      ) : (
        /* Orders Grid */
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
{filteredOrders.map((order) => (
  <div
    key={order.id}
    className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition"
  >
    {/* Header */}
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">
          {order.order_number}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
  {order.order_type === 'renewal' ? '🔄 Renewal' :
   order.order_type === 'package_order' ? '📦 Package' :
   order.order_type === 'initial_package' ? '🚀 Onboarding' : '🛒 Items'}
</p>

        <p className="text-[11px] text-gray-500 truncate">
          {order.gym_name}
        </p>

        <p className="text-[11px] text-gray-400">
          {formatDate(order.order_date)}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        {getStatusBadge(order.status)}
        {getPaymentBadge(order.payment_status)}
      </div>
    </div>

    {/* Divider */}
    <div className="border-t border-gray-100" />

    {/* Items (MyOrders style compact list) */}
    <div className="space-y-1">
      {order.items?.slice(0, 3).map((item, idx) => (
        <div key={idx} className="flex justify-between text-xs">
          <span className="text-gray-700 truncate">
            {item.item_name}
          </span>
          <span className="text-gray-400">
            {item.allocated_quantity}/{item.quantity}
          </span>
        </div>
      ))}

      {order.items?.length > 3 && (
        <p className="text-[11px] text-gray-400">
          +{order.items.length - 3} more items
        </p>
      )}
    </div>

    {/* Footer */}
    <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
      <p className="text-xs text-gray-500">
        ₱{order.total_amount.toLocaleString()}
      </p>

      <div className="flex gap-1.5">
        <button
          onClick={() => handleViewDetails(order)}
          className="px-2.5 py-1 rounded-lg text-[12px] bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          View
        </button>

{/* Renewal: Process opens payment modal directly */}
{order.status === "pending" && order.order_type === "renewal" && (
  <button
    onClick={() => handleOpenCompleteModal(order)}
    className="px-2.5 py-1 rounded-lg text-[12px] bg-blue-600 text-white hover:bg-blue-700"
  >
    Process
  </button>
)}

{/* Non-renewal: normal Process */}
{order.status === "pending" && order.order_type !== "renewal" && (
  <button
    onClick={() => handleProcessOrder(order.id)}
    disabled={processingOrderId === order.id}
    className="px-2.5 py-1 rounded-lg text-[12px] bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
  >
    {processingOrderId === order.id ? "Processing..." : "Process"}
  </button>
)}

        {order.status === "processing" && (
          <button
            onClick={() => handleOpenCompleteModal(order)}
            className="px-2.5 py-1 rounded-lg text-[12px] bg-blue-600 text-white hover:bg-blue-700"
          >
            Complete
          </button>
        )}
      </div>
    </div>
  </div>
))}
        </div>
      )}

      {/* Modals (unchanged logic) */}
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