"use client";

import { useState, useEffect } from "react";
import { Size, Color, LocationGroup } from "@prisma/client";
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
import { toast } from "sonner";
import { MediaUpload } from "@/components/store/utils/media-upload";

interface VariantFormProps {
  value: Array<{
    id?: string;
    sizeId?: string | null;
    colorId?: string | null;
    stock: number;
    media: Array<{ url: string; mediaType: "IMAGE" | "VIDEO" }>;
    sku?: string;
    hsn?: string;
    gstIn?: string;
    variantPrices: Array<{
      locationGroupId: string;
      price: number;
      mrp: number;
    }>;
  }>;
  onChange: (
    value: Array<{
      id?: string;
      sizeId?: string | null;
      colorId?: string | null;
      stock: number;
      media: Array<{ url: string; mediaType: "IMAGE" | "VIDEO" }>;
      sku?: string;
      hsn?: string;
      gstIn?: string;
      variantPrices: Array<{
        locationGroupId: string;
        price: number;
        mrp: number;
      }>;
    }>
  ) => void;
  sizes: Size[];
  colors: Color[];
  locationGroups: LocationGroup[];
}

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  min?: number;
  step?: number;
}

const NumberInput = ({
  value,
  onChange,
  disabled,
  placeholder,
  min,
  step,
}: NumberInputProps) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  return (
    <Input
      type="number"
      min={min}
      step={step}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        const num = parseInt(localValue) || 0;
        setLocalValue(num.toString());
        onChange(num);
      }}
      onFocus={(e) => e.target.select()}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

export default function VariantForm({
  value,
  onChange,
  sizes,
  colors,
  locationGroups,
}: VariantFormProps) {
  const [loading, setLoading] = useState(false);

  // Validate that all variants have at least one price
  const validateVariants = () => {
    if (locationGroups.length === 0) {
      toast.error("No location groups available. Please add at least one.");
      return false;
    }
    return value.every((variant) => variant.variantPrices.length > 0);
  };

  const addVariant = () => {
    if (locationGroups.length === 0) {
      toast.error("Cannot add variant: No location groups available.");
      return;
    }
    onChange([
      ...value,
      {
        stock: 0,
        media: [],
        sku: "",
        hsn: "",
        gstIn: "",
        sizeId: null,
        colorId: null,
        variantPrices: [
          {
            locationGroupId: locationGroups[0].id,
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
    if (locationGroups.length === 0) {
      toast.error("Cannot add price: No location groups available.");
      return;
    }
    const newVariants = [...value];
    newVariants[variantIndex].variantPrices.push({
      locationGroupId: locationGroups[0].id,
      price: 0,
      mrp: 0,
    });
    onChange(newVariants);
  };

  const removePrice = (variantIndex: number, priceIndex: number) => {
    const newVariants = [...value];
    if (newVariants[variantIndex].variantPrices.length <= 1) {
      toast.error("Each variant must have at least one price.");
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
              <NumberInput
                value={variant.stock}
                onChange={(num) => updateVariant(variantIndex, { stock: num })}
                placeholder="Enter stock"
                disabled={loading}
                min={0}
                step={1}
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

            <div>
              <label className="block text-sm font-medium mb-1">HSN Code</label>
              <Input
                value={variant.hsn || ""}
                onChange={(e) =>
                  updateVariant(variantIndex, { hsn: e.target.value })
                }
                placeholder="Enter HSN Code"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                GSTIN Number
              </label>
              <Input
                value={variant.gstIn || ""}
                onChange={(e) =>
                  updateVariant(variantIndex, { gstIn: e.target.value })
                }
                placeholder="Enter GSTIN Number"
                disabled={loading}
              />
            </div>
            <div className="mt-4 md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Prices by Location Group</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPrice(variantIndex)}
                  disabled={loading || locationGroups.length === 0}
                >
                  Add Price
                </Button>
              </div>
              {variant.variantPrices.length === 0 && (
                <p className="text-destructive text-sm mb-2">
                  At least one price per location group is required.
                </p>
              )}
              {variant.variantPrices.map((price, priceIndex) => (
                <div
                  key={priceIndex}
                  className="border p-3 rounded-md flex items-center gap-4 mb-2"
                >
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      Location Group
                    </label>
                    <Select
                      disabled={loading}
                      onValueChange={(val) => {
                        if (
                          variant.variantPrices.some(
                            (p, i) =>
                              i !== priceIndex && p.locationGroupId === val
                          )
                        ) {
                          toast.error(
                            `Price for '${
                              locationGroups.find((lg) => lg.id === val)?.name
                            }' already exists in this variant.`
                          );
                          return;
                        }
                        updatePrice(variantIndex, priceIndex, {
                          ...price,
                          locationGroupId: val,
                        });
                      }}
                      value={price.locationGroupId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location group" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      Price (INR)
                    </label>
                    <NumberInput
                      value={price.price}
                      onChange={(num) =>
                        updatePrice(variantIndex, priceIndex, {
                          ...price,
                          price: num,
                        })
                      }
                      placeholder="Enter price"
                      disabled={loading}
                      min={0}
                      step={1}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      MRP (INR)
                    </label>
                    <NumberInput
                      value={price.mrp}
                      onChange={(num) =>
                        updatePrice(variantIndex, priceIndex, {
                          ...price,
                          mrp: num,
                        })
                      }
                      placeholder="Enter MRP"
                      disabled={loading}
                      min={0}
                      step={1}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removePrice(variantIndex, priceIndex)}
                    disabled={loading || variant.variantPrices.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Media (Images/Videos)
              </label>
              <MediaUpload
                value={variant.media}
                disabled={loading}
                onChange={(media) => updateVariant(variantIndex, { media })}
                onRemove={(url) =>
                  updateVariant(variantIndex, {
                    media: variant.media.filter((m) => m.url !== url),
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
        disabled={loading || locationGroups.length === 0}
      >
        Add Variant
      </Button>
    </div>
  );
}
