import type {
  DeliveryStatus,
  FulfillmentSource,
  InvoiceStatus,
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

export type CustomerListItemDTO = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  salesAgentName: string;
  isActive: boolean;
};

export type CustomerDetailDTO = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  salesAgentId: string;
  salesAgentName: string;
  isActive: boolean;
};

export type AssignableAgentDTO = {
  id: string;
  name: string;
  role: "OWNER" | "SALES_AGENT";
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
  purchaseRequestId: string | null;
  purchaseRequestStatus: PurchaseRequestStatus | null;
  deliveryId: string | null;
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

export type DeliveryDTO = {
  id: string;
  deliveryNumber: string;
  status: DeliveryStatus;
  deliveredAt: string | null;
  notes: string | null;
  lineIds: string[];
  invoiceId: string | null;
  invoiceNumber: string | null;
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
  deliveries: DeliveryDTO[];
};

export type PurchaseRequestListItemDTO = {
  id: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  productSku: string;
  unit: string;
  supplierName: string;
  quantity: number;
  status: PurchaseRequestStatus;
  expectedDate: string | null;
  receivedAt: string | null;
  createdAt: string;
};

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

export type InvoiceListItemDTO = {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  total: number;
  balance: number;
  status: InvoiceStatus;
  isOverdue: boolean;
  agingBucket: AgingBucket | null;
};

export type PaymentDTO = {
  id: string;
  amount: number;
  paymentDate: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  recordedByName: string;
};

export type InvoiceDetailDTO = {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  deliveryId: string;
  deliveryNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  isOverdue: boolean;
  lines: OrderLineDTO[];
  payments: PaymentDTO[];
};

export type ArAgingSummary = {
  buckets: Record<AgingBucket, number>;
  totalOutstanding: number;
  invoiceCount: number;
};

export type DashboardMetric = {
  label: string;
  value: string;
  sublabel?: string;
};
