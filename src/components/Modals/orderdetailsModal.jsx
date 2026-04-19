import React, { useEffect, useState } from 'react';
import api from '../../api';

const OrderDetailsModal = ({ order, onClose, getStatusBadge, getPaymentBadge, show }) => {
  const [allocatedRfids, setAllocatedRfids] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (order && show) {
      fetchAllocatedRfids();
    }
  }, [order, show]);

  const fetchAllocatedRfids = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/partner-orders/${order.id}/allocated-rfids`);
      setAllocatedRfids(data);
    } catch (error) {
      console.error('Failed to fetch RFIDs:', error);
      setAllocatedRfids(null);
    } finally {
      setLoading(false);
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

  if (!show || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-medium text-gray-900">{order.order_number}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{order.gym_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              {getStatusBadge(order.status)}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Payment</p>
              {getPaymentBadge(order.payment_status)}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Type</p>
              <p className="text-xs font-medium text-gray-900">
                {order.order_type === 'initial_package' ? 'Initial Package' : 'Reorder'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total</p>
              <p className="text-xs font-medium text-gray-900">₱{order.total_amount.toLocaleString()}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-900 mb-3">Timeline</p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Ordered</span>
                <span className="text-xs text-gray-700">{formatDate(order.order_date)}</span>
              </div>
              {order.processed_at && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Processed</span>
                  <span className="text-xs text-gray-700">{formatDate(order.processed_at)}</span>
                </div>
              )}
              {order.shipped_at && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Shipped</span>
                  <span className="text-xs text-gray-700">{formatDate(order.shipped_at)}</span>
                </div>
              )}
              {order.received_at && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Received</span>
                  <span className="text-xs text-gray-700">{formatDate(order.received_at)}</span>
                </div>
              )}
              {order.completed_at && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Completed</span>
                  <span className="text-xs text-gray-700">{formatDate(order.completed_at)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-900 mb-3">Order Items</p>
            <div className="space-y-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-gray-900">{item.item_name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {item.item_type} · ₱{item.unit_price.toLocaleString()} each
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-900">{item.allocated_quantity}/{item.quantity}</p>
                    <p className="text-[11px] text-gray-400">₱{item.subtotal.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400">Loading RFID details...</p>
            </div>
          ) : allocatedRfids && allocatedRfids.total > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-medium text-gray-900">Allocated RFIDs</p>
                <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                  {allocatedRfids.total}
                </span>
              </div>
              <div className="space-y-3">
                {Object.entries(allocatedRfids.rfids).map(([role, rfids]) => (
                  <div key={role}>
                    <p className="text-xs text-gray-500 mb-2">{role} RFIDs</p>
                    <div className="grid grid-cols-2 gap-2">
                      {rfids.map((rfid) => (
                        <div key={rfid.id} className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="font-mono text-xs font-medium text-blue-700">{rfid.rfid_tag}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{rfid.rfid_type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.notes && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-900 mb-2">Notes</p>
              <p className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                {order.notes}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;