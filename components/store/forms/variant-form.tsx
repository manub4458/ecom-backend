"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { ImageUpload } from "../utils/image-upload";
import { Color, Size } from "@prisma/client";
import * as z from "zod";
import { VariantSchema } from "@/schemas/product-form-schema";

interface VariantFormProps {
  value: z.infer<typeof VariantSchema>[];
  onChange: (value: z.infer<typeof VariantSchema>[]) => void;
  sizes: Size[];
  colors: Color[];
}

const VariantForm = ({ value, onChange, sizes, colors }: VariantFormProps) => {
  const addVariant = () => {
    onChange([
      ...value,
      {
        price: 0,
        mrp: 0,
        stock: 0,
        images: [],
        sizeId: undefined,
        colorId: undefined,
        sku: "",
      },
    ]);
  };

  const updateVariant = (
    index: number,
    data: Partial<z.infer<typeof VariantSchema>>
  ) => {
    const updated = [...value];
    updated[index] = { ...updated[index], ...data };
    onChange(updated);
  };

  const removeVariant = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {value.map((variant, index) => (
        <div key={index} className="border p-4 rounded-md">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">Variant #{index + 1}</h4>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => removeVariant(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Size</label>
              <select
                value={variant.sizeId || ""}
                onChange={(e) =>
                  updateVariant(index, { sizeId: e.target.value || undefined })
                }
                className="w-full p-2 border rounded"
              >
                <option value="">Select size</option>
                {sizes.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <select
                value={variant.colorId || ""}
                onChange={(e) =>
                  updateVariant(index, { colorId: e.target.value || undefined })
                }
                className="w-full p-2 border rounded"
              >
                <option value="">Select color</option>
                {colors.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Price (INR)
              </label>
              <Input
                type="number"
                value={variant.price}
                onChange={(e) =>
                  updateVariant(index, { price: Number(e.target.value) })
                }
                placeholder="Enter price"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                MRP (INR)
              </label>
              <Input
                type="number"
                value={variant.mrp}
                onChange={(e) =>
                  updateVariant(index, { mrp: Number(e.target.value) })
                }
                placeholder="Enter MRP"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock</label>
              <Input
                type="number"
                value={variant.stock}
                onChange={(e) =>
                  updateVariant(index, { stock: Number(e.target.value) })
                }
                placeholder="Enter stock"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">SKU</label>
              <Input
                value={variant.sku || ""}
                onChange={(e) => updateVariant(index, { sku: e.target.value })}
                placeholder="Enter SKU"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Images</label>
              <ImageUpload
                value={variant.images}
                disabled={false}
                onChange={(urls) => updateVariant(index, { images: urls })}
                onRemove={(url) =>
                  updateVariant(index, {
                    images: variant.images.filter((img) => img !== url),
                  })
                }
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" onClick={addVariant}>
        Add Variant
      </Button>
    </div>
  );
};

export default VariantForm;
