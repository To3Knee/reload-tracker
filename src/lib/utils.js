export const formatCurrency = (num) => `$${Number(num).toFixed(3)}`

export const calculatePerUnit = (price, shipping, tax, qty) => {
  const total = Number(price) + Number(shipping || 0) + Number(tax || 0)
  return qty > 0 ? total / qty : 0
}