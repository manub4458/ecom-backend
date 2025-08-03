import { CouponForm } from "@/components/store/forms/coupon-form";
import { db } from "@/lib/db";

const CouponPage = async ({
  params,
}: {
  params: { storeId: string; couponId: string };
}) => {
  let coupon = null;

  if (params.couponId !== "create") {
    coupon = await db.coupon.findUnique({
      where: {
        id: params.couponId,
        storeId: params.storeId,
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  const products = await db.product.findMany({
    where: {
      storeId: params.storeId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <CouponForm data={coupon} products={products} />
      </div>
    </div>
  );
};

export default CouponPage;
