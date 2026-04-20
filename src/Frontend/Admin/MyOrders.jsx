import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OwnerSidebar from '../../components/OwnerSidebar';
import { useToast } from '../../components/ToastManager';
import OrderDetailsModal from '../../components/Modals/orderdetailsModal';
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
  const [availableInventory, setAvailableInventory] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
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
    if (user?.id || user?.adminId) fetchOrders();
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

  const fetchAvailableInventory = async () => {
    try {
      const { data } = await api.get('/api/partner-orders/available-inventory');
      setAvailableInventory(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      showToast({ message: 'Failed to fetch inventory', type: 'error' });
    }
  };

  const filterOrders = () => {
    setFilteredOrders(
      statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)
    );
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Pending' },
      processing: { color: 'bg-blue-50 text-blue-700 border-blue-100', label: 'Processing' },
      completed: { color: 'bg-green-50 text-green-700 border-green-100', label: 'Completed' },
      cancelled: { color: 'bg-red-50 text-red-600 border-red-100', label: 'Cancelled' },
    };
    const c = config[status] || config.pending;
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border font-medium ${c.color}`}>
        {c.label}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus) => (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border font-medium ${
      paymentStatus === 'paid'
        ? 'bg-green-50 text-green-700 border-green-100'
        : 'bg-gray-100 text-gray-500 border-gray-200'
    }`}>
      {paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
    </span>
  );

  const handleCancelOrder = (orderId) => {
    showConfirm('Cancel this order? This action cannot be undone.', async () => {
      try {
        await api.put(`/api/partner-orders/${orderId}/cancel`);
        showToast({ message: 'Order cancelled successfully!', type: 'success' });
        fetchOrders();
      } catch (error) {
        showToast({ message: error.response?.data?.error || 'Failed to cancel order', type: 'error' });
      }
    });
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleOpenCreateModal = () => {
    fetchAvailableInventory();
    setSelectedItems([]);
    setNotes('');
    setShowCreateModal(true);
  };

  const handleAddItem = (inventoryItem) => {
    if (selectedItems.find(i => i.item_name === inventoryItem.name)) {
      showToast({ message: 'Item already added', type: 'warning' });
      return;
    }
    setSelectedItems([...selectedItems, {
      item_name: inventoryItem.name,
      available_quantity: inventoryItem.available_quantity,
      unit_price: inventoryItem.selling_price,
      quantity: 1,
    }]);
  };

  const handleRemoveItem = (itemName) => {
    setSelectedItems(selectedItems.filter(i => i.item_name !== itemName));
  };

  const handleQuantityChange = (itemName, newQuantity) => {
    setSelectedItems(selectedItems.map(item =>
      item.item_name === itemName
        ? { ...item, quantity: Math.max(1, Math.min(newQuantity, item.available_quantity)) }
        : item
    ));
  };

  const calculateTotal = () =>
    selectedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleCreateOrder = async () => {
    if (selectedItems.length === 0) {
      showToast({ message: 'Please add at least one item', type: 'error' });
      return;
    }
    try {
      setCreatingOrder(true);
      const adminId = user.adminId || user.id;
      await api.post('/api/partner-orders/create', {
        admin_id: adminId,
        items: selectedItems,
        notes: notes.trim() || null,
      });
      showToast({ message: 'Order created successfully!', type: 'success' });
      setShowCreateModal(false);
      setSelectedItems([]);
      setNotes('');
      fetchOrders();
    } catch (error) {
      console.error('Create order error:', error);
      showToast({ message: error.response?.data?.error || 'Failed to create order', type: 'error' });
    } finally {
      setCreatingOrder(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSelectedItems([]);
    setNotes('');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />

      <main className="flex-1 min-w-0 p-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">My Orders</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage your orders and inventory requests</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            Create Order
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <KpiCard title="Pending" value={orders.filter(o => o.status === 'pending').length} color="text-gray-700" />
          <KpiCard title="Processing" value={orders.filter(o => o.status === 'processing').length} color="text-blue-600" />
          <KpiCard title="Completed" value={orders.filter(o => o.status === 'completed').length} color="text-green-600" />
        </div>

        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 mb-5">
          <label className="text-xs text-gray-500">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-xs font-medium text-gray-500">No orders found</p>
            <p className="text-xs text-gray-400 mt-1">
              {statusFilter !== 'all' ? 'Try adjusting your filter' : 'Create your first order to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-gray-900">{order.order_number}</p>
                      <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full">
                        {order.order_type === 'initial_package' ? 'Initial' : 'Reorder'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">{formatDate(order.order_date)}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Amount</span>
                    <span className="text-xs font-semibold text-gray-900">
                      ₱{order.total_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Payment</span>
                    {getPaymentBadge(order.payment_status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Items</span>
                    <span className="text-xs text-gray-700">{order.items?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Progress</span>
                    <span className="text-xs font-medium text-gray-900">{order.completion_percentage}%</span>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-auto">
                  <button
                    onClick={() => handleViewDetails(order)}
                    className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                  >
                    View Details
                  </button>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="bg-white text-red-500 border border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center">
                <p className="text-sm font-medium text-gray-900">Create New Order</p>
                <button
                  onClick={closeCreateModal}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <p className="text-xs font-medium text-gray-900 mb-3">Available Inventory</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
                    {availableInventory.length === 0 ? (
                      <p className="text-xs text-gray-400 col-span-2 text-center py-4">Loading inventory...</p>
                    ) : (
                      availableInventory.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-xl">
                          <div>
                            <p className="text-xs font-medium text-gray-900">{item.name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Stock: {item.available_quantity} · ₱{item.selling_price.toLocaleString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddItem(item)}
                            disabled={item.available_quantity === 0}
                            className="bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-white"
                          >
                            {item.available_quantity === 0 ? 'Out of stock' : 'Add'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-medium text-gray-900">Selected Items</p>
                    <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                      {selectedItems.length}
                    </span>
                  </div>
                  {selectedItems.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                      <p className="text-xs text-gray-400">No items selected yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedItems.map((item) => (
                        <div key={item.item_name} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900">{item.item_name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">₱{item.unit_price.toLocaleString()} each</p>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max={item.available_quantity}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.item_name, parseInt(e.target.value) || 1)}
                            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-900 text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs font-semibold text-gray-900 w-20 text-right">
                            ₱{(item.quantity * item.unit_price).toLocaleString()}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.item_name)}
                            className="bg-white text-red-500 border border-red-100 hover:bg-red-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special instructions..."
                    rows="2"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Total Amount</span>
                  <span className="text-lg font-semibold text-gray-900">₱{calculateTotal().toLocaleString()}</span>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateOrder}
                    disabled={creatingOrder || selectedItems.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {creatingOrder ? 'Creating...' : 'Create Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => { setShowDetailsModal(false); setSelectedOrder(null); }}
          getStatusBadge={getStatusBadge}
          getPaymentBadge={getPaymentBadge}
          show={showDetailsModal}
        />
      </main>
    </div>
  );
};

const KpiCard = ({ title, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <p className="text-xs text-gray-500">{title}</p>
    <p className={`text-lg font-semibold mt-0.5 ${color}`}>{value}</p>
  </div>
);

export default MyOrders;