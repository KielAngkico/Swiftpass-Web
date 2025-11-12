import React, { useEffect, useState } from 'react';
import api from '../../../api';

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

  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">{order.order_number}</h2>
            <p className="text-xs text-gray-500">{order.gym_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Status Summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
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
              <p className="font-medium">
                {order.order_type === 'initial_package' ? 'Initial Package' : 'Reorder'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total</p>
              <p className="font-bold">₱{order.total_amount.toLocaleString()}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t pt-3">
            <h3 className="font-semibold text-sm mb-2">Timeline</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Ordered:</span>
                <span>{formatDate(order.order_date)}</span>
              </div>
              {order.processed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Processed:</span>
                  <span>{formatDate(order.processed_at)}</span>
                </div>
              )}
              {order.shipped_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipped:</span>
                  <span>{formatDate(order.shipped_at)}</span>
                </div>
              )}
              {order.received_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Received:</span>
                  <span>{formatDate(order.received_at)}</span>
                </div>
              )}
              {order.completed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span>{formatDate(order.completed_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="border-t pt-3">
            <h3 className="font-semibold text-sm mb-2">Order Items</h3>
            <div className="space-y-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    <p className="text-xs text-gray-500">
                      {item.item_type} • ₱{item.unit_price.toLocaleString()} each
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{item.allocated_quantity}/{item.quantity}</p>
                    <p className="text-xs text-gray-500">₱{item.subtotal.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Allocated RFIDs */}
          {loading ? (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500">Loading RFID details...</p>
            </div>
          ) : allocatedRfids && allocatedRfids.total > 0 && (
            <div className="border-t pt-3">
              <h3 className="font-semibold text-sm mb-2">
                Allocated RFIDs ({allocatedRfids.total})
              </h3>
              <div className="space-y-3">
                {Object.entries(allocatedRfids.rfids).map(([role, rfids]) => (
                  <div key={role}>
                    <p className="text-xs font-medium text-gray-700 mb-2">{role} RFIDs:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {rfids.map((rfid) => (
                        <div key={rfid.id} className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
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

          {/* Notes */}
          {order.notes && (
            <div className="border-t pt-3">
              <h3 className="font-semibold text-sm mb-2">Notes</h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;