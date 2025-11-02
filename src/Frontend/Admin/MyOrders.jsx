import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  
  // Inventory items for order creation
  const [availableInventory, setAvailableInventory] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/me', { credentials: 'include' });
        const data = await response.json();
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
      const response = await fetch(`/api/partner-orders/partner/${adminId}`);
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableInventory = async () => {
    try {
      const response = await fetch('/api/partner-orders/available-inventory');
      const data = await response.json();
      setAvailableInventory(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
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
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: '⏳ Pending' },
      processing: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: '📦 Processing' },
      delivering: { color: 'bg-purple-100 text-purple-800 border-purple-300', label: '🚚 Delivering' },
      received: { color: 'bg-orange-100 text-orange-800 border-orange-300', label: '📬 Received' },
      completed: { color: 'bg-green-100 text-green-800 border-green-300', label: '✅ Completed' },
      cancelled: { color: 'bg-red-100 text-red-800 border-red-300', label: '❌ Cancelled' }
    };
    const cfg = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus) => {
    return paymentStatus === 'paid' ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Paid</span>
    ) : (
      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Unpaid</span>
    );
  };

  const handleReceiveOrder = async (orderId) => {
    if (!window.confirm('Confirm that you have received this order?')) return;
    
    try {
      const response = await fetch(`/api/partner-orders/${orderId}/receive`, {
        method: 'PUT'
      });
      
      if (!response.ok) throw new Error('Failed to receive order');
      
      alert('Order received! Awaiting payment confirmation from SuperAdmin.');
      fetchOrders();
    } catch (error) {
      alert(error.message || 'Failed to receive order');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('⚠️ Cancel this order? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/partner-orders/${orderId}/cancel`, {
        method: 'PUT'
      });
      
      if (!response.ok) throw new Error('Failed to cancel order');
      
      alert('Order cancelled successfully!');
      fetchOrders();
    } catch (error) {
      alert(error.message || 'Failed to cancel order');
    }
  };

  const handleViewDetails = async (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
    
    try {
      const response = await fetch(`/api/partner-orders/${order.id}/allocated-rfids`);
      const data = await response.json();
      setAllocatedRfids(data);
    } catch (error) {
      console.error('Failed to fetch RFIDs:', error);
      setAllocatedRfids(null);
    }
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
      alert('Item already added');
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
      alert('Please add at least one item');
      return;
    }

    try {
      setCreatingOrder(true);
      const adminId = user.adminId || user.id;
      
      const response = await fetch('/api/partner-orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: adminId,
          items: selectedItems,
          notes: notes.trim() || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      alert('Order created successfully! Payment will be processed upon delivery.');
      setShowCreateModal(false);
      fetchOrders();
    } catch (error) {
      alert(error.message);
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

  const OrderCard = ({ order }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900">{order.order_number}</h3>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {order.order_type === 'initial_package' ? 'Initial Package' : 'Reorder'}
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
              <span className="text-gray-600">Fulfillment:</span>
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
                <span className="text-gray-600">{item.allocated_quantity}/{item.quantity}</span>
              </div>
            ))}
            {order.items?.length > 2 && (
              <p className="text-xs text-gray-500 italic">+{order.items.length - 2} more items</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleViewDetails(order)}
            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 text-xs font-medium"
          >
            View Details
          </button>

          {order.status === 'delivering' && (
            <button
              onClick={() => handleReceiveOrder(order.id)}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-xs font-medium"
            >
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
      <div className="w-64 bg-white border-r">
        <div className="p-4">
          <h2 className="font-bold text-lg">Partner Portal</h2>
        </div>
      </div>
      
      <main className="flex-1 p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">My Orders</h1>
          <p className="text-gray-600 text-sm">Track and manage your orders</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Create New Order
          </button>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm"
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500 mb-4">No orders found</p>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Create Order
            </button>
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
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">Create New Order</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✖</button>
              </div>

              <form onSubmit={handleCreateOrder} className="p-6">
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Available Inventory</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded p-3">
                    {availableInventory.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-600">
                            Stock: {item.available_quantity} • ₱{item.selling_price.toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddItem(item)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Selected Items ({selectedItems.length})</h3>
                  {selectedItems.length === 0 ? (
                    <p className="text-gray-500 text-sm">No items selected</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedItems.map((item) => (
                        <div key={item.item_name} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.item_name}</p>
                            <p className="text-xs text-gray-600">₱{item.unit_price.toLocaleString()} each</p>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max={item.available_quantity}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.item_name, parseInt(e.target.value))}
                            className="w-20 px-2 py-1 border rounded text-sm"
                          />
                          <p className="font-semibold text-sm w-24 text-right">
                            ₱{(item.quantity * item.unit_price).toLocaleString()}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.item_name)}
                            className="text-red-600 hover:text-red-700 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special instructions..."
                    rows="3"
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>

                <div className="mb-6 p-4 bg-blue-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₱{calculateTotal().toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Payment will be processed upon delivery confirmation
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingOrder || selectedItems.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {creatingOrder ? 'Creating...' : 'Create Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">{selectedOrder.order_number}</h2>
                  <p className="text-sm text-gray-600">{formatDate(selectedOrder.order_date)}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedOrder(null);
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
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-xs text-gray-500">
                            ₱{item.unit_price.toLocaleString()} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold">₱{item.subtotal.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Notes</h3>
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

export default MyOrders;