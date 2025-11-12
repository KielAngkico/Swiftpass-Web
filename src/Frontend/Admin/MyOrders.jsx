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
  
  // Inventory-based order creation
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
    let filtered = orders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-gray-100 text-gray-800', label: 'Pending' },
      processing: { color: 'bg-gray-100 text-gray-800', label: 'Processing' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
    };
    const c = config[status] || config.pending;
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.color}`}>{c.label}</span>;
  };

  const getPaymentBadge = (paymentStatus) => {
    return paymentStatus === 'paid' ? (
      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-semibold">Paid</span>
    ) : (
      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-semibold">Unpaid</span>
    );
  };

  const handleCancelOrder = async (orderId) => {
    showConfirm(
      'Cancel this order? This action cannot be undone.',
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

  const handleOpenCreateModal = () => {
    fetchAvailableInventory();
    setSelectedItems([]);
    setNotes('');
    setShowCreateModal(true);
  };

  const handleAddItem = (inventoryItem) => {
    const existing = selectedItems.find(i => i.item_name === inventoryItem.name);
    if (existing) {
      showToast({ message: 'Item already added', type: 'warning' });
      return;
    }

    setSelectedItems([...selectedItems, {
      item_name: inventoryItem.name,
      available_quantity: inventoryItem.available_quantity,
      unit_price: inventoryItem.selling_price,
      quantity: 1
    }]);
  };

  const handleRemoveItem = (itemName) => {
    setSelectedItems(selectedItems.filter(i => i.item_name !== itemName));
  };

  const handleQuantityChange = (itemName, newQuantity) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.item_name === itemName) {
        const qty = Math.max(1, Math.min(newQuantity, item.available_quantity));
        return { ...item, quantity: qty };
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    
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
        notes: notes.trim() || null
      });

      showToast({ message: 'Order created successfully!', type: 'success' });
      setShowCreateModal(false);
      setSelectedItems([]);
      setNotes('');
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

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const KPI = ({ title, value }) => (
    <div className="bg-white p-2 rounded shadow text-center">
      <p className="text-gray-500 text-xs">{title}</p>
      <p className="font-bold text-gray-900 text-base">{value}</p>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <OwnerSidebar />
      
      <main className="flex-1 bg-white p-2">
        {/* Header */}
        <div className="mb-3 flex justify-between items-start">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">My Orders</h1>
            <p className="text-xs text-gray-500">Manage your orders and inventory requests</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-800 text-sm font-medium"
          >
            + Create Order
          </button>
        </div>

        {/* Filter */}
        <div className="bg-white p-2 rounded shadow-sm mb-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Filter:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <KPI title="Pending" value={orders.filter(o => o.status === 'pending').length} />
          <KPI title="Processing" value={orders.filter(o => o.status === 'processing').length} />
          <KPI title="Completed" value={orders.filter(o => o.status === 'completed').length} />
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-gray-900 border-t-transparent rounded-full" />
            <span className="ml-2 text-sm text-gray-600">Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded shadow-sm">
            <p className="text-sm text-gray-500">No orders found</p>
            <p className="text-xs text-gray-400 mt-1">
              {statusFilter !== 'all' 
                ? 'Try adjusting your filter' 
                : 'Create your first order to get started'}
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
                    <p className="text-xs text-gray-500">{formatDate(order.order_date)}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Info */}
                <div className="space-y-1 mb-2 pb-2 border-b">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-gray-900">₱{order.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Payment:</span>
                    {getPaymentBadge(order.payment_status)}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Items:</span>
                    <span className="text-gray-700">{order.items?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Progress:</span>
                    <span className="font-medium text-gray-900">{order.completion_percentage}%</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => handleViewDetails(order)}
                    className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 text-xs font-medium"
                  >
                    View Details
                  </button>

                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Order Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Create New Order</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedItems([]);
                    setNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="p-4">
                {/* Available Inventory */}
                <div className="mb-4">
                  <h3 className="font-semibold text-sm text-gray-900 mb-2">Available Inventory</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded p-2 bg-gray-50">
                    {availableInventory.length === 0 ? (
                      <p className="text-gray-500 text-xs col-span-2 text-center py-4">Loading inventory...</p>
                    ) : (
                      availableInventory.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-2 bg-white border border-gray-200 rounded">
                          <div>
                            <p className="font-medium text-xs text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-600">
                              Stock: {item.available_quantity} • ₱{item.selling_price.toLocaleString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddItem(item)}
                            disabled={item.available_quantity === 0}
                            className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-medium hover:bg-gray-800 disabled:bg-gray-300"
                          >
                            {item.available_quantity === 0 ? 'Out' : '+ Add'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Selected Items */}
                <div className="mb-4">
                  <h3 className="font-semibold text-sm text-gray-900 mb-2">
                    Selected Items ({selectedItems.length})
                  </h3>
                  {selectedItems.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 text-xs">No items selected yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedItems.map((item) => (
                        <div key={item.item_name} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="font-medium text-xs text-gray-900">{item.item_name}</p>
                            <p className="text-xs text-gray-600">₱{item.unit_price.toLocaleString()} each</p>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max={item.available_quantity}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.item_name, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border rounded text-xs text-center"
                          />
                          <div className="w-20 text-right">
                            <p className="font-semibold text-xs">₱{(item.quantity * item.unit_price).toLocaleString()}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.item_name)}
                            className="text-red-600 hover:text-red-700 font-bold text-lg"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special instructions..."
                    rows="2"
                    className="w-full px-2 py-1.5 border rounded text-sm"
                  />
                </div>

                {/* Total */}
                <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-gray-700">Total Amount:</span>
                    <span className="text-xl font-bold text-gray-900">₱{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedItems([]);
                      setNotes('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateOrder}
                    disabled={creatingOrder || selectedItems.length === 0}
                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium disabled:bg-gray-400"
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

export default MyOrders;