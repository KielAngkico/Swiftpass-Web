const formatPaymentMethod = (method) => {
  if (!method) return null;
  
  const map = {
    'gcash': 'GCash',
    'maya': 'Maya',
    'paymaya': 'Maya',
    'e-wallet': 'E-Wallet',
    'ewallet': 'E-Wallet',
    'cash': 'Cash',
    'bank transfer': 'Bank Transfer',
    'card': 'Card',
  };

  return map[method.toLowerCase()] || 
    method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
};

module.exports = formatPaymentMethod;