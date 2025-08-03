"use client";

import { useState } from "react";
import { Size, Color, Location } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/store/utils/image-upload";
import { toast } from "sonner";

interface VariantFormProps {
  value: Array<{
    id?: string;
    sizeId?: string | null;
    colorId?: string | null;
    stock: number;
    images: string[];
    sku?: string;
    variantPrices: Array<{ locationId: string; price: number; mrp: number }>;
  }>;
  onChange: (
    value: Array<{
      id?: string;
      sizeId?: string | null;
      colorId?: string | null;
      stock: number;
      images: string[];
      sku?: string;
      variantPrices: Array<{ locationId: string; price: number; mrp: number }>;
    }>
  ) => void;
  sizes: Size[];
  colors: Color[];
  locations: Location[];
}

export default function VariantForm({
  value,
  onChange,
  sizes,
  colors,
  locations,
}: VariantFormProps) {
  const [loading, setLoading] = useState(false);

  // Find the location with pincode 110040
  const requiredLocation = locations.find((loc) => loc.pincode === "110040");

  // Validate that all variants have a price for pincode 110040
  const validateVariants = () => {
    if (!requiredLocation) {
      toast.error("Required location with pincode 110040 not found.");
      return false;
    }
    return value.every((variant) =>
      variant.variantPrices.some(
        (price) => price.locationId === requiredLocation.id
      )
    );
  };

  const addVariant = () => {
    if (!requiredLocation) {
      toast.error(
        "Cannot add variant: Location with pincode 110040 not found."
      );
      return;
    }
    onChange([
      ...value,
      {
        stock: 0,
        images: [],
        sku: "",
        sizeId: null,
        colorId: null,
        variantPrices: [
          {
            locationId: requiredLocation.id,
            price: 0,
            mrp: 0,
          },
        ],
      },
    ]);
  };

  const removeVariant = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, updatedVariant: any) => {
    const newVariants = [...value];
    newVariants[index] = { ...newVariants[index], ...updatedVariant };
    onChange(newVariants);
  };

  const addPrice = (variantIndex: number) => {
    const newVariants = [...value];
    newVariants[variantIndex].variantPrices.push({
      locationId: locations[0]?.id || "",
      price: 0,
      mrp: 0,
    });
    onChange(newVariants);
  };

  const removePrice = (variantIndex: number, priceIndex: number) => {
    const newVariants = [...value];
    const priceToRemove = newVariants[variantIndex].variantPrices[priceIndex];
    if (requiredLocation && priceToRemove.locationId === requiredLocation.id) {
      toast.error("Cannot remove price for required pincode 110040.");
      return;
    }
    newVariants[variantIndex].variantPrices = newVariants[
      variantIndex
    ].variantPrices.filter((_, i) => i !== priceIndex);
    onChange(newVariants);
  };

  const updatePrice = (
    variantIndex: number,
    priceIndex: number,
    updatedPrice: any
  ) => {
    const newVariants = [...value];
    newVariants[variantIndex].variantPrices[priceIndex] = updatedPrice;
    onChange(newVariants);
  };

  return (
    <div className="space-y-4">
      {value.map((variant, variantIndex) => (
        <div key={variantIndex} className="border p-4 rounded-md">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">Variant #{variantIndex + 1}</h4>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => removeVariant(variantIndex)}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Size</label>
              <select
                value={variant.sizeId ?? "none"}
                onChange={(e) =>
                  updateVariant(variantIndex, {
                    sizeId: e.target.value === "none" ? null : e.target.value,
                  })
                }
                className="w-full p-2 border rounded"
                disabled={loading}
              >
                <option value="none">None</option>
                {sizes.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name} ({size.value})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <select
                value={variant.colorId ?? "none"}
                onChange={(e) =>
                  updateVariant(variantIndex, {
                    colorId: e.target.value === "none" ? null : e.target.value,
                  })
                }
                className="w-full p-2 border rounded"
                disabled={loading}
              >
                <option value="none">None</option>
                {colors.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock</label>
              <Input
                type="number"
                value={variant.stock}
                onChange={(e) =>
                  updateVariant(variantIndex, {
                    stock: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Enter stock"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">SKU</label>
              <Input
                value={variant.sku || ""}
                onChange={(e) =>
                  updateVariant(variantIndex, { sku: e.target.value })
                }
                placeholder="Enter SKU"
                disabled={loading}
              />
            </div>
            <div className="mt-4 md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Prices by Location</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPrice(variantIndex)}
                  disabled={loading || locations.length === 0}
                >
                  Add Price
                </Button>
              </div>
              {!variant.variantPrices.some(
                (price) => price.locationId === requiredLocation?.id
              ) && (
                <p className="text-destructive text-sm mb-2">
                  Price for pincode 110040 is required.
                </p>
              )}
              {variant.variantPrices.map((price, priceIndex) => (
                <div
                  key={priceIndex}
                  className="border p-3 rounded-md flex items-center gap-4 mb-2"
                >
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      Location
                    </label>
                    <Select
                      disabled={loading}
                      onValueChange={(val) => {
                        if (
                          requiredLocation &&
                          variant.variantPrices.some(
                            (p, i) =>
                              i !== priceIndex &&
                              p.locationId === requiredLocation.id
                          ) &&
                          val === requiredLocation.id
                        ) {
                          toast.error(
                            "Price for pincode 110040 already exists in this variant."
                          );
                          return;
                        }
                        updatePrice(variantIndex, priceIndex, {
                          ...price,
                          locationId: val,
                        });
                      }}
                      value={price.locationId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.city}, {location.state},{" "}
                            {location.country} ({location.pincode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      Price (INR)
                    </label>
                    <Input
                      type="number"
                      value={price.price}
                      onChange={(e) =>
                        updatePrice(variantIndex, priceIndex, {
                          ...price,
                          price: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="Enter price"
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      MRP (INR)
                    </label>
                    <Input
                      type="number"
                      value={price.mrp}
                      onChange={(e) =>
                        updatePrice(variantIndex, priceIndex, {
                          ...price,
                          mrp: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="Enter MRP"
                      disabled={loading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removePrice(variantIndex, priceIndex)}
                    disabled={
                      loading ||
                      (requiredLocation &&
                        price.locationId === requiredLocation.id)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Images</label>
              <ImageUpload
                value={variant.images}
                disabled={loading}
                onChange={(urls) =>
                  updateVariant(variantIndex, { images: urls })
                }
                onRemove={(url) =>
                  updateVariant(variantIndex, {
                    images: variant.images.filter((img) => img !== url),
                  })
                }
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={addVariant}
        disabled={loading || !requiredLocation}
      >
        Add Variant
      </Button>
    </div>
  );
}
