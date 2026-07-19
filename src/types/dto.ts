import type {
  FulfillmentSource,
  OrderStatus,
  PurchaseRequestStatus,
} from "@prisma/client";

// Plain, RSC-serializable shapes. Prisma's Decimal is a class instance and
// cannot cross the server/client boundary as a prop, so every Decimal field
// is converted to `number` before it leaves the data-access layer.

export type CustomerDTO = {
  id: string;
  name: string;
  contactName: string | null;
  salesAgentId: string;
  salesAgentName: string;
};

export type ProductDTO = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  defaultSellingPrice: number;
  trackInventory: boolean;
  currentStock: number;
};

export type SupplierDTO = {
  id: string;
  name: string;
};

export type OrderLineDTO = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  fulfillmentSource: FulfillmentSource;
  supplierId: string | null;
  supplierName: string | null;
  stockDeducted: boolean;
  purchaseRequestStatus: PurchaseRequestStatus | null;
};

export type OrderListItemDTO = {
  id: string;
  orderNumber: string;
  customerName: string;
  salesAgentName: string;
  status: OrderStatus;
  orderDate: string;
  total: number;
  lineCount: number;
};

export type OrderDetailDTO = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderDate: string;
  notes: string | null;
  subtotal: number;
  total: number;
  customerId: string;
  customerName: string;
  salesAgentId: string;
  salesAgentName: string;
  approvedAt: string | null;
  approvedByName: string | null;
  cancelledAt: string | null;
  lines: OrderLineDTO[];
};
