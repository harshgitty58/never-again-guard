/**
 * Checkout validation — FIX(INC-103 AI-4)
 * Rejects orders with a total <= 0 to prevent ₹0 orders from slipping through.
 */
export class InvalidOrderError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'InvalidOrderError';
  }
}

/**
 * Validate an order total before accepting the order.
 * @param {number} total - computed order total in rupees
 */
export function validateOrderTotal(total) {
  if (!Number.isFinite(total) || total <= 0) {
    throw new InvalidOrderError(`Order total must be > 0, got: ${total}`);
  }
}
