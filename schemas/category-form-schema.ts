import * as z from "zod";

export const CategoryFormSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required",
  }),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(60, "Slug must be at most 60 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  bannerImage: z.string().min(1, {
    message: "Banner Image is required",
  }),
  landingPageBanner: z.string().optional(),
});
