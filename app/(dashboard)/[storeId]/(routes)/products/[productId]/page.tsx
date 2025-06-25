import { db } from "@/lib/db";
import { ProductForm } from "@/components/store/forms/product-form";

const ProductPage = async ({
  params,
}: {
  params: { productId: string; storeId: string };
}) => {
  let product = null;

  if (params.productId !== "create") {
    product = await db.product.findUnique({
      where: {
        id: params.productId,
      },
      include: {
        category: true,
        subCategory: {
          include: {
            parent: true,
          },
        },
        variants: {
          include: {
            size: true,
            color: true,
            images: true,
          },
        },
        productSpecifications: {
          include: {
            specificationField: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    });
  }

  const categories = await db.category.findMany({
    where: {
      storeId: params.storeId,
    },
  });

  const subCategories = await db.subCategory.findMany({
    where: {
      storeId: params.storeId,
    },
    include: {
      parent: true,
    },
  });

  const sizes = await db.size.findMany({
    where: {
      storeId: params.storeId,
    },
  });

  const colors = await db.color.findMany({
    where: {
      storeId: params.storeId,
    },
  });

  const specificationFields = await db.specificationField.findMany({
    where: {
      storeId: params.storeId,
    },
    include: {
      group: true,
    },
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ProductForm
          data={product}
          categories={categories}
          subCategories={subCategories}
          sizes={sizes}
          colors={colors}
          specificationFields={specificationFields}
        />
      </div>
    </div>
  );
};

export default ProductPage;
