-- AlterTable
ALTER TABLE "order_lines" ADD COLUMN     "costTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "defaultCostPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;
