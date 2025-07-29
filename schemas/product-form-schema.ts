import * as z from "zod";

export const VariantSchema = z.object({
  id: z.string().optional(),
  sizeId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  colorId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  stock: z.number().min(0, "Stock must be non-negative"),
  media: z
    .array(
      z.object({
        url: z.string().url(),
        mediaType: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
      })
    )
    .min(1, "At least one media item is required"),
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
  brandId: z.string().nullable().optional(),
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
