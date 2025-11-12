import React from 'react';

const PaymentModal = ({ 
  order, 
  paymentOptions, 
  paymentData, 
  setPaymentData, 
  onComplete, 
  onClose, 
  completingOrder,
  show 
}) => {
  if (!show || !order) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Complete Order</h2>
          <p className="text-xs text-gray-500">{order.order_number}</p>
        </div>

        <div className="p-4">
          {order.order_type === 'initial_package' ? (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="font-medium text-blue-900 mb-1">Initial Package Order</p>
              <p className="text-xs text-blue-700">
                Payment was already recorded at signup. Click "Complete" to finalize.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Partner:</span>
                  <span className="text-sm font-medium">{order.gym_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="text-xl font-bold text-green-600">
                    ₱{order.total_amount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select payment method</option>
                  {paymentOptions.map((option) => (
                    <option key={option.id} value={option.payment_method}>
                      {option.payment_method}
                    </option>
                  ))}
                </select>
              </div>

              {paymentData.payment_method && paymentData.payment_method.toLowerCase() !== 'cash' && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number *
                  </label>
                  <input
                    type="text"
                    value={paymentData.reference_number}
                    onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                    placeholder="Enter reference number"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for {paymentData.payment_method} payments
                  </p>
                </div>
              )}

              <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                Make sure you've received the payment before completing.
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm"
              disabled={completingOrder}
            >
              Cancel
            </button>
            <button
              onClick={onComplete}
              disabled={completingOrder}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:bg-green-400"
            >
              {completingOrder ? 'Completing...' : 'Complete Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;