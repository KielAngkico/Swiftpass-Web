import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OwnerSidebar from '../../components/OwnerSidebar';
import { useToast } from '../../components/ToastManager';
import OrderDetailsModal from '../../components/Modals/orderdetailsModal';
import api from '../../api';

const TYPE_CONFIG = {
  onboarding:      { badge: 'bg-purple-50 text-purple-700 border-purple-100', label: 'Onboarding' },
  subscription:    { badge: 'bg-blue-50 text-blue-700 border-blue-100',       label: 'Subscription' },
  hardware_module: { badge: 'bg-amber-50 text-amber-700 border-amber-100',    label: 'Hardware' },
  rfid_bundle:     { badge: 'bg-green-50 text-green-700 border-green-100',    label: 'RFID Bundle' },
};

const ORDER_TYPES = [
  { value: 'renewal',       label: 'Renewal',       icon: '🔄', desc: 'Extend your subscription', pkgTypes: ['subscription'] },
  { value: 'package_order', label: 'Package Order',  icon: '📦', desc: 'Hardware modules & RFID bundles', pkgTypes: ['hardware_module', 'rfid_bundle'] },
  { value: 'reorder',       label: 'Items Order',    icon: '🛒', desc: 'Individual parts & stock', pkgTypes: [] },
];

export default function MyOrders() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Create order modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orderStep, setOrderStep] = useState('type'); // 'type' | 'form'
  const [selectedOrderType, setSelectedOrderType] = useState(null);

  // Package order state
  const [availablePackages, setAvailablePackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageNotes, setPackageNotes] = useState('');

  // Items order state (existing)
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
        if (!data?.authenticated || !data?.user) throw new Error();
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
    setFilteredOrders(
      statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)
    );
  }, [statusFilter, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const adminId = user.adminId || user.id;
      const { data } = await api.get(`/api/partner-orders/partner/${adminId}`);
      setOrders(data);
    } catch {
      showToast({ message: 'Failed to fetch orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePackages = async () => {
    try {
      const { data } = await api.get('/api/partner-orders/available-packages');
      setAvailablePackages(data);
    } catch {
      showToast({ message: 'Failed to fetch packages', type: 'error' });
    }
  };

  const fetchAvailableInventory = async () => {
    try {
      const { data } = await api.get('/api/partner-orders/available-inventory');
      setAvailableInventory(data);
    } catch {
      showToast({ message: 'Failed to fetch inventory', type: 'error' });
    }
  };

  // ── Modal open/close ──────────────────────────────────────────────────────
  const handleOpenCreateModal = () => {
    setOrderStep('type');
    setSelectedOrderType(null);
    setSelectedPackage(null);
    setSelectedItems([]);
    setNotes('');
    setPackageNotes('');
    setShowCreateModal(true);
  };

  const handleSelectOrderType = (type) => {
    setSelectedOrderType(type);
    setOrderStep('form');
    if (type.value === 'reorder') {
      fetchAvailableInventory();
    } else {
      fetchAvailablePackages();
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setOrderStep('type');
    setSelectedOrderType(null);
    setSelectedPackage(null);
    setSelectedItems([]);
    setNotes('');
    setPackageNotes('');
  };

  // ── Submit handlers ───────────────────────────────────────────────────────
  const handleCreatePackageOrder = async () => {
    if (!selectedPackage) {
      showToast({ message: 'Please select a package', type: 'error' });
      return;
    }
    try {
      setCreatingOrder(true);
      const adminId = user.adminId || user.id;
      await api.post('/api/partner-orders/order-package', {
        admin_id: adminId,
        package_id: selectedPackage.id,
        notes: packageNotes.trim() || null,
      });
      showToast({ message: 'Order created successfully!', type: 'success' });
      closeCreateModal();
      fetchOrders();
    } catch (err) {
      showToast({ message: err.response?.data?.error || 'Failed to create order', type: 'error' });
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleCreateItemsOrder = async () => {
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
      closeCreateModal();
      fetchOrders();
    } catch (err) {
      showToast({ message: err.response?.data?.error || 'Failed to create order', type: 'error' });
    } finally {
      setCreatingOrder(false);
    }
  };

  // Items order helpers (unchanged)
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

  const handleRemoveItem = (itemName) =>
    setSelectedItems(selectedItems.filter(i => i.item_name !== itemName));

  const handleQuantityChange = (itemName, newQty) =>
    setSelectedItems(selectedItems.map(i =>
      i.item_name === itemName
        ? { ...i, quantity: Math.max(1, Math.min(newQty, i.available_quantity)) }
        : i
    ));

  const calculateTotal = () =>
    selectedItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  // ── Badges ────────────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const config = {
      pending:    { color: 'bg-gray-100 text-gray-600 border-gray-200',   label: 'Pending' },
      processing: { color: 'bg-blue-50 text-blue-700 border-blue-100',    label: 'Processing' },
      completed:  { color: 'bg-green-50 text-green-700 border-green-100', label: 'Completed' },
      cancelled:  { color: 'bg-red-50 text-red-600 border-red-100',       label: 'Cancelled' },
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

  const getOrderTypeBadge = (orderType) => {
    const map = {
      renewal:         'bg-blue-50 text-blue-700 border-blue-100',
      package_order:   'bg-amber-50 text-amber-700 border-amber-100',
      reorder:         'bg-gray-50 text-gray-600 border-gray-200',
      initial_package: 'bg-purple-50 text-purple-700 border-purple-100',
    };
    const labels = {
      renewal: 'Renewal', package_order: 'Package', reorder: 'Items', initial_package: 'Onboarding'
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border font-medium ${map[orderType] || map.reorder}`}>
        {labels[orderType] || orderType}
      </span>
    );
  };

  const handleCancelOrder = (orderId) => {
    showConfirm('Cancel this order? This action cannot be undone.', async () => {
      try {
        await api.put(`/api/partner-orders/${orderId}/cancel`);
        showToast({ message: 'Order cancelled successfully!', type: 'success' });
        fetchOrders();
      } catch (err) {
        showToast({ message: err.response?.data?.error || 'Failed to cancel order', type: 'error' });
      }
    });
  };

  const formatDate = (date) =>
    new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  // ── Filtered packages by selected order type ──────────────────────────────
  const filteredPackages = availablePackages.filter(p =>
    selectedOrderType?.pkgTypes.includes(p.package_type)
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />

      <main className="flex-1 min-w-0 p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">My Orders</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage your orders and transactions</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            Create Order
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <KpiCard title="Pending"    value={orders.filter(o => o.status === 'pending').length}    color="text-gray-700" />
          <KpiCard title="Processing" value={orders.filter(o => o.status === 'processing').length} color="text-blue-600" />
          <KpiCard title="Completed"  value={orders.filter(o => o.status === 'completed').length}  color="text-green-600" />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-5">
          <label className="text-xs text-gray-500">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5 ml-auto">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>

        {/* Orders grid */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-xs text-gray-400">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-xs font-medium text-gray-400 mb-1">No orders found</p>
            <p className="text-xs text-gray-400">
              {statusFilter !== 'all' ? 'Try adjusting your filter' : 'Create your first order to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{order.order_number}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(order.order_date)}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="flex items-center gap-1.5 mb-2">
                  {getOrderTypeBadge(order.order_type)}
                  {getPaymentBadge(order.payment_status)}
                </div>

                <div className="flex items-center justify-between py-2 border-t border-gray-100 mb-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[11px] text-gray-400">Items</p>
                      <p className="text-xs font-medium text-gray-700">{order.items?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400">Progress</p>
                      <p className="text-xs font-medium text-gray-700">{order.completion_percentage}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400">Total</p>
                    <p className="text-xs font-semibold text-gray-900">₱{order.total_amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-auto">
                  <button
                    onClick={() => { setSelectedOrder(order); setShowDetailsModal(true); }}
                    className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                  >
                    View
                  </button>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="bg-white text-red-500 border border-red-100 hover:bg-red-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Create Order Modal ── */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">

              {/* Modal header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {orderStep === 'type' ? 'Create Order' : `New ${selectedOrderType?.label}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {orderStep === 'type'
                      ? 'What would you like to order?'
                      : selectedOrderType?.desc}
                  </p>
                </div>
                <button
                  onClick={closeCreateModal}
                  className="w-7 h-7 flex items-center justify-center bg-white text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs"
                >
                  ×
                </button>
              </div>

              <div className="p-5">

                {/* ── STEP 1: Type selector ── */}
                {orderStep === 'type' && (
                  <div className="grid grid-cols-3 gap-3">
                    {ORDER_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => handleSelectOrderType(type)}
                        className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-center group"
                      >
                        <span className="text-2xl">{type.icon}</span>
                        <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700">
                          {type.label}
                        </p>
                        <p className="text-[11px] text-gray-400 group-hover:text-blue-500 leading-snug">
                          {type.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── STEP 2a: Renewal / Package order ── */}
                {orderStep === 'form' && selectedOrderType?.value !== 'reorder' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
                      {filteredPackages.length === 0 ? (
                        <div className="text-center py-8 text-xs text-gray-400">
                          No packages available
                        </div>
                      ) : (
                        filteredPackages.map((pkg) => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => setSelectedPackage(pkg)}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                              selectedPackage?.id === pkg.id
                                ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900">{pkg.name}</p>
                                {pkg.duration_days > 0 && (
                                  <p className="text-[11px] text-gray-400 mt-0.5">
                                    {pkg.duration_days} days
                                  </p>
                                )}
                                {pkg.items?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {pkg.items.slice(0, 3).map((it, j) => (
                                      <span key={j} className="text-[11px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                                        {it.sub_package_name || it.item_name}
                                        {it.quantity > 1 ? ` ×${it.quantity}` : ''}
                                      </span>
                                    ))}
                                    {pkg.items.length > 3 && (
                                      <span className="text-[11px] text-gray-400">+{pkg.items.length - 3} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm font-bold text-blue-600 ml-3 flex-shrink-0">
                                ₱{Number(pkg.price).toLocaleString()}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                      <textarea
                        value={packageNotes}
                        onChange={(e) => setPackageNotes(e.target.value)}
                        placeholder="Any special instructions..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    {selectedPackage && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="text-xs font-medium text-blue-800">{selectedPackage.name}</p>
                          {selectedPackage.duration_days > 0 && (
                            <p className="text-[11px] text-blue-500 mt-0.5">
                              Extends subscription by {selectedPackage.duration_days} days
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-bold text-blue-700">
                          ₱{Number(selectedPackage.price).toLocaleString()}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setOrderStep('type')}
                        className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleCreatePackageOrder}
                        disabled={creatingOrder || !selectedPackage}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {creatingOrder ? 'Creating...' : `Place Order — ₱${Number(selectedPackage?.price || 0).toLocaleString()}`}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 2b: Items order ── */}
                {orderStep === 'form' && selectedOrderType?.value === 'reorder' && (
                  <div className="space-y-4">
                    {/* Available inventory */}
                    <div>
                      <p className="text-xs font-medium text-gray-900 mb-2 pb-2 border-b border-gray-100">
                        Available Inventory
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {availableInventory.length === 0 ? (
                          <p className="text-xs text-gray-400 col-span-2 text-center py-4">Loading...</p>
                        ) : availableInventory.map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-xl">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                Stock: {item.available_quantity} · ₱{item.selling_price.toLocaleString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddItem(item)}
                              disabled={item.available_quantity === 0}
                              className="bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:border-gray-200 disabled:text-gray-400 ml-2 flex-shrink-0"
                            >
                              {item.available_quantity === 0 ? 'Out' : 'Add'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Selected items */}
                    <div>
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-900">Selected Items</p>
                        <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                          {selectedItems.length}
                        </span>
                      </div>
                      {selectedItems.length === 0 ? (
                        <div className="text-center py-5 border border-dashed border-gray-200 rounded-xl">
                          <p className="text-xs text-gray-400">No items selected</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedItems.map((item) => (
                            <div key={item.item_name} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">{item.item_name}</p>
                                <p className="text-[11px] text-gray-400">₱{item.unit_price.toLocaleString()} each</p>
                              </div>
                              <input
                                type="number"
                                min="1"
                                max={item.available_quantity}
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.item_name, parseInt(e.target.value) || 1)}
                                className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <p className="text-xs font-semibold text-gray-900 w-16 text-right flex-shrink-0">
                                ₱{(item.quantity * item.unit_price).toLocaleString()}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.item_name)}
                                className="text-red-500 border border-red-100 bg-white hover:bg-red-50 px-2 py-1 rounded-lg text-[11px] flex-shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Special instructions..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">Total</span>
                      <span className="text-sm font-semibold text-gray-900">₱{calculateTotal().toLocaleString()}</span>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setOrderStep('type')}
                        className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateItemsOrder}
                        disabled={creatingOrder || selectedItems.length === 0}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {creatingOrder ? 'Creating...' : `Place Order — ₱${calculateTotal().toLocaleString()}`}
                      </button>
                    </div>
                  </div>
                )}
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
}

const KpiCard = ({ title, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <p className="text-xs text-gray-500">{title}</p>
    <p className={`text-lg font-semibold mt-0.5 ${color}`}>{value}</p>
  </div>
);