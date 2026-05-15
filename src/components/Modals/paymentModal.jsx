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
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header (matched style) */}
        <div className="sticky top-0 bg-white flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-medium text-gray-900">
              Complete Order
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {order.order_number}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">

          {/* Summary (OrderDetails card style) */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Partner</span>
              <span className="text-xs font-medium text-gray-900">
                {order.gym_name}
              </span>
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-xs font-medium text-gray-900">
                ₱{order.total_amount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Initial package notice */}
          {order.order_type === 'initial_package' && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-600">
                Payment already recorded during onboarding.
              </p>
            </div>
          )}

          {/* Payment form */}
          {order.order_type !== 'initial_package' && (
            <div className="space-y-4">

              {/* Payment Method */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      payment_method: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none"
                >
                  <option value="">Select method</option>
                  {paymentOptions.map((opt) => (
                    <option key={opt.id} value={opt.payment_method}>
                      {opt.payment_method}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference */}
              {paymentData.payment_method &&
                paymentData.payment_method.toLowerCase() !== 'cash' && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Reference Number
                    </p>
                    <input
                      value={paymentData.reference_number}
                      onChange={(e) =>
                        setPaymentData({
                          ...paymentData,
                          reference_number: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none"
                      placeholder="Enter reference number"
                    />
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={completingOrder}
            className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={onComplete}
            disabled={completingOrder}
            className="flex-1 bg-green-600 text-white hover:bg-green-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            {completingOrder ? 'Processing...' : 'Complete'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;