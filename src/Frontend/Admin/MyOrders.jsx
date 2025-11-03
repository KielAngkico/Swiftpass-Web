import React, { useState, useEffect } from 'react';
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
  
  // Inventory-based order creation (from working code)
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

  const handleReceiveOrder = async (orderId) => {
    showConfirm(
      'Confirm that you have received this order?',
      async () => {
        try {
          await api.put(`/api/partner-orders/${orderId}/receive`);
          showToast({ message: 'Order received! Awaiting payment confirmation from SuperAdmin.', type: 'success' });
          fetchOrders();
        } catch (error) {
          showToast({ 
            message: error.response?.data?.error || 'Failed to receive order', 
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

      showToast({ message: 'Order created successfully! Payment will be processed upon delivery.', type: 'success' });
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
            View Details
          </button>

          {order.status === 'delivering' && (
            <button
              onClick={() => handleReceiveOrder(order.id)}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-xs font-medium flex items-center justify-center gap-1"
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
      <OwnerSidebar />
      
      <main className="flex-1 p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">My Orders</h1>
          <p className="text-gray-600 text-sm">Track and manage your orders</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            ➕ Create New Order
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
            <option value="received">Received</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
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
            <p className="text-2xl font-bold text-orange-600">{orders.filter(o => o.status === 'received').length}</p>
            <p className="text-xs text-gray-600">Received</p>
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
            <p className="text-gray-500 mb-1">No orders found</p>
            <p className="text-sm text-gray-400 mb-4">
              {statusFilter !== 'all' 
                ? 'Try adjusting your filter' 
                : 'Create your first order to get started'}
            </p>
            {statusFilter === 'all' && (
              <button
                onClick={handleOpenCreateModal}
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
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedItems([]);
                    setNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ✖
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="p-6">
                {/* Available Inventory Section */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Available Inventory</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                    {availableInventory.length === 0 ? (
                      <p className="text-gray-500 text-sm col-span-2 text-center py-4">Loading inventory...</p>
                    ) : (
                      availableInventory.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-600">
                              Stock: <span className="font-semibold">{item.available_quantity}</span> • 
                              <span className="text-green-600 font-semibold"> ₱{item.selling_price.toLocaleString()}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddItem(item)}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                            disabled={item.available_quantity === 0}
                          >
                            {item.available_quantity === 0 ? 'Out of Stock' : '+ Add'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Selected Items Section */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Selected Items ({selectedItems.length})
                  </h3>
                  {selectedItems.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 text-sm">No items selected yet</p>
                      <p className="text-gray-400 text-xs mt-1">Add items from the inventory above</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedItems.map((item) => (
                        <div key={item.item_name} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{item.item_name}</p>
                            <p className="text-xs text-gray-600">
                              ₱{item.unit_price.toLocaleString()} each • 
                              Max: {item.available_quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max={item.available_quantity}
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.item_name, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <div className="w-24 text-right">
                              <p className="font-semibold text-sm text-gray-900">
                                ₱{(item.quantity * item.unit_price).toLocaleString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.item_name)}
                              className="text-red-600 hover:text-red-700 font-bold text-xl ml-2"
                              title="Remove item"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special instructions or notes..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Total Section */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₱{calculateTotal().toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    💳 Payment will be processed upon delivery confirmation
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedItems([]);
                      setNotes('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingOrder || selectedItems.length === 0}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    {creatingOrder ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <span>Create Order</span>
                        {selectedItems.length > 0 && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {selectedItems.length}
                          </span>
                        )}
                      </>
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
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
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
                      <div className="flex-1">
                        <p className="font-medium text-blue-900 text-sm mb-1">
                          🚚 Order is on the way!
                        </p>
                        <p className="text-blue-700 text-xs mb-3">
                          Please confirm receipt once you receive your order.
                        </p>
                        <button
                          onClick={() => {
                            setShowDetailsModal(false);
                            handleReceiveOrder(selectedOrder.id);
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium flex items-center gap-1"
                        >
                          ✓ Confirm Receipt
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