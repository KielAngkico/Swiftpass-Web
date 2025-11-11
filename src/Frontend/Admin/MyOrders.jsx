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
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allocatedRfids, setAllocatedRfids] = useState(null);
  
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
  }, [statusFilter, searchTerm, orders]);

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

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_number?.toLowerCase().includes(term) ||
        order.notes?.toLowerCase().includes(term)
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      
      <main className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Partner Orders</h1>
          <p className="text-gray-600 mt-1">Manage your orders and inventory requests</p>
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
                placeholder="Search by order number..."
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

        {/* Create Order Button */}
        <div className="mb-6">
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Create New Order
          </button>
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
                    <p className="text-xl font-bold text-gray-900">{order.items?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completion</p>
                    <p className="text-xl font-bold text-blue-600">{order.completion_percentage}%</p>
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
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
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
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✖
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="p-6">
                {/* Available Inventory */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Available Inventory</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                    {availableInventory.length === 0 ? (
                      <p className="text-gray-500 text-sm col-span-2 text-center py-4">Loading inventory...</p>
                    ) : (
                      availableInventory.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-600">
                              Stock: {item.available_quantity} • ₱{item.selling_price.toLocaleString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddItem(item)}
                            disabled={item.available_quantity === 0}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300"
                          >
                            {item.available_quantity === 0 ? 'Out of Stock' : '+ Add'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Selected Items */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Selected Items ({selectedItems.length})
                  </h3>
                  {selectedItems.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 text-sm">No items selected yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedItems.map((item) => (
                        <div key={item.item_name} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{item.item_name}</p>
                            <p className="text-xs text-gray-600">₱{item.unit_price.toLocaleString()} each</p>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max={item.available_quantity}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.item_name, parseInt(e.target.value) || 1)}
                            className="w-20 px-2 py-1.5 border rounded text-sm text-center"
                          />
                          <div className="w-24 text-right">
                            <p className="font-semibold text-sm">₱{(item.quantity * item.unit_price).toLocaleString()}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.item_name)}
                            className="text-red-600 hover:text-red-700 font-bold text-xl"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special instructions..."
                    rows="3"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                {/* Total */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">₱{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedItems([]);
                      setNotes('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingOrder || selectedItems.length === 0}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400 flex items-center justify-center gap-2"
                  >
                    {creatingOrder ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Creating...
                      </>
                    ) : (
                      'Create Order'
                    )}
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
                  <h2 className="text-xl font-bold text-gray-900">{selectedOrder.order_number}</h2>
                  <p className="text-sm text-gray-600">{formatDate(selectedOrder.order_date)}</p>
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
                    {selectedOrder.items?.map((item, idx) => (
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
      </main>
    </div>
  );
};

export default MyOrders;