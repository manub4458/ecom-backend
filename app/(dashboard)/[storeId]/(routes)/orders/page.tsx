import { Metadata } from "next";
import { format } from "date-fns";
import { db } from "@/lib/db";

import { OrderClient } from "@/components/store/utils/order-client";
import { OrderColumn } from "@/components/store/utils/columns";
import { formatter } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Store | Orders",
};

const OrdersPage = async ({ params }: { params: { storeId: string } }) => {
  const orders = await db.order.findMany({
    where: {
      storeId: params.storeId,
    },
    include: {
      orderItems: {
        include: {
          variant: {
            include: {
              product: true,
              size: true,
              color: true,
              variantPrices: true, // Include variantPrices
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedOrders: OrderColumn[] = orders
    .map((item) => {
      // Filter valid orderItems with non-null variantId and variant
      const validOrderItems = item.orderItems.filter(
        (orderItem) => orderItem.variantId && orderItem.variant
      );

      // Skip orders with no valid orderItems
      if (validOrderItems.length === 0) {
        return null;
      }

      return {
        id: item.id,
        phone: item.phone,
        address: item.address,
        isPaid: item.isPaid,
        products: validOrderItems
          .map((orderItem) => {
            const variant = orderItem.variant;
            const details = [
              variant.product.name,
              variant.size?.value ? `(${variant.size.value}` : "",
              variant.color?.name ? `${variant.color.name})` : "",
            ]
              .filter(Boolean)
              .join(" ");
            return details;
          })
          .join(", "),
        totalPrice: formatter.format(
          validOrderItems.reduce((total, item) => {
            // Use the first variantPrice's price, or fallback to 0
            const price = item.variant.variantPrices[0]?.price || 0;
            return total + price * item.quantity;
          }, 0)
        ),
        isCompleted: item.isCompleted ? "Completed" : "Failed",
        gstnumber: item.gstNumber ? item.gstNumber : "Not provided",
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
      };
    })
    .filter((order): order is OrderColumn => order !== null);

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OrderClient data={formattedOrders} />
      </div>
    </div>
  );
};

export default OrdersPage;
