import * as z from "zod";

// product-form-schema.ts
export const VariantSchema = z.object({
  id: z.string().optional(),
  sizeId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)), // Convert empty string to null
  colorId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)), // Convert empty string to null
  stock: z.number().min(0, "Stock must be non-negative"),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
  sku: z.string().optional(),
  variantPrices: z
    .array(
      z.object({
        locationId: z.string().min(1, "Location is required"),
        price: z.number().min(0, "Price must be non-negative"),
        mrp: z.number().min(0, "MRP must be non-negative"),
      })
    )
    .min(1, "At least one price per location is required"),
});

export const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(60, "Slug must be at most 60 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  brand: z.string().optional(),
  about: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  sizeAndFit: z.array(z.string()).optional(),
  materialAndCare: z.array(z.string()).optional(),
  enabledFeatures: z.array(z.string()).optional(),
  expressDelivery: z.boolean().default(false),
  warranty: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isArchieved: z.boolean().default(false),
  categoryId: z.string().min(1, "Category is required"),
  subCategoryId: z.string().optional(),
  variants: z.array(VariantSchema).min(1, "At least one variant is required"),
  specifications: z
    .array(
      z.object({
        specificationFieldId: z
          .string()
          .min(1, "Specification field is required"),
        value: z.string().min(1, "Value is required"),
      })
    )
    .optional(),
});
