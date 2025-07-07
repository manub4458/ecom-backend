"use client";

import * as z from "zod";
import { useState } from "react";
import {
  Category,
  Color,
  Product,
  Size,
  SubCategory,
  SpecificationField,
  Variant,
  VariantImage,
  Location,
} from "@prisma/client";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Trash2 } from "lucide-react";
import { Header } from "@/components/store/utils/header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { useParams, useRouter } from "next/navigation";
import { AlertModal } from "@/components/modals/alert-modal";
import { ImageUpload } from "@/components/store/utils/image-upload";
import { ProductSchema } from "@/schemas/product-form-schema";
import { Switch } from "@/components/ui/switch";
import { ProductFeatures } from "../utils/product-features";
import { SpecificationInput } from "../utils/specification-input";
import Editor from "./editor";
import VariantForm from "./variant-form";

const getSubCategoryName = (
  subCategory: SubCategory,
  subCategories: SubCategory[]
): string => {
  if (!subCategory.parentId) return subCategory.name;
  const parent = subCategories.find((sub) => sub.id === subCategory.parentId);
  return parent
    ? `${getSubCategoryName(parent, subCategories)} > ${subCategory.name}`
    : subCategory.name;
};

interface ProductFormProps {
  data:
    | (Product & {
        variants: (Variant & {
          images: VariantImage[];
          variantPrices: { locationId: string; price: number; mrp: number }[];
        })[];
        productSpecifications: {
          specificationFieldId: string;
          value: string;
        }[];
      })
    | null;
  categories: Category[];
  subCategories: SubCategory[];
  sizes: Size[];
  colors: Color[];
  specificationFields: (SpecificationField & { group: { name: string } })[];
  locations: Location[];
}

export const ProductForm = ({
  data,
  categories,
  subCategories,
  sizes,
  colors,
  specificationFields,
  locations,
}: ProductFormProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const router = useRouter();

  const title = data ? "Edit Product" : "Create Product";
  const description = data ? "Edit a product" : "Add a new product";
  const toastMessage = data ? "Product updated." : "Product created.";
  const actions = data ? "Save Changes" : "Create";

  const form = useForm<z.infer<typeof ProductSchema>>({
    resolver: zodResolver(ProductSchema),
    defaultValues: data
      ? {
          ...data,
          slug: data.slug || "",
          brand: data.brand || "",
          categoryId: data.categoryId ?? undefined,
          subCategoryId: data.subCategoryId ?? undefined,
          about: data.about || "",
          description: data.description || "",
          materialAndCare: data.materialAndCare || [],
          sizeAndFit: data.sizeAndFit || [],
          enabledFeatures: data.enabledFeatures || [],
          expressDelivery: data.expressDelivery || false,
          warranty: data.warranty || "",
          isFeatured: data.isFeatured || false,
          isNewArrival: data.isNewArrival || false,
          isArchieved: data.isArchieved || false,
          specifications: data.productSpecifications || [],
          variants: data.variants.map((v: any) => ({
            ...v,
            images: v.images.map((img: any) => img.url),
            variantPrices: v.variantPrices || [],
          })),
        }
      : {
          name: "",
          slug: "",
          brand: "",
          about: "",
          description: "",
          materialAndCare: [],
          sizeAndFit: [],
          enabledFeatures: [],
          expressDelivery: false,
          warranty: "",
          isFeatured: false,
          isNewArrival: false,
          isArchieved: false,
          categoryId: "",
          subCategoryId: undefined,
          specifications: [],
          variants: [
            {
              stock: 0,
              images: [],
              sizeId: undefined,
              colorId: undefined,
              sku: "",
              variantPrices: [],
            },
          ],
        },
  });

  const onSubmit = async (values: z.infer<typeof ProductSchema>) => {
    try {
      setLoading(true);

      const submitValues = {
        ...values,
        subCategoryId:
          values.subCategoryId === "none" ? undefined : values.subCategoryId,
      };

      if (data) {
        await axios.patch(
          `/api/${params.storeId}/products/${params.productId}`,
          submitValues
        );
      } else {
        await axios.post(`/api/${params.storeId}/products`, submitValues);
      }
      router.refresh();
      router.push(`/${params.storeId}/products`);
      router.refresh();
      toast.success(toastMessage);
    } catch (error: any) {
      console.log(error);
      if (
        error.response?.status === 400 &&
        error.response?.data === "Slug or SKU already exists"
      ) {
        form.setError("slug", {
          type: "manual",
          message: "Slug already exists. Please choose a different slug.",
        });
      } else {
        toast.error("Internal server error");
      }
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.storeId}/products/${params.productId}`);
      router.refresh();
      router.push(`/${params.storeId}/products`);
      router.refresh();
      toast.success("Product deleted");
    } catch (error) {
      console.error(error);
      toast.error("Internal server error");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryId = form.watch("categoryId");

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        loading={loading}
        onConfirm={onDelete}
      />
      <div className="flex items-center justify-between">
        <Header title={title} description={description} />
        {data && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={loading}
                      placeholder="Product name"
                    />
                  </FormControl>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About Product</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={loading}
                      placeholder="About Product"
                    />
                  </FormControl>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={loading}
                      placeholder="Product slug"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    The slug must be unique, contain only lowercase letters,
                    numbers, and hyphens, and be at most 60 characters long.
                  </FormDescription>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          defaultValue={field.value}
                          placeholder="Select a category"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Description</FormLabel>
                  <FormControl>
                    <Editor
                      value={field.value}
                      onChange={field.onChange}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value || "none"}
                    defaultValue={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          defaultValue={field.value || "none"}
                          placeholder="Select a subcategory"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {subCategories
                        .filter(
                          (sub) =>
                            !selectedCategoryId ||
                            sub.categoryId === selectedCategoryId
                        )
                        .map((subCategory) => (
                          <SelectItem
                            key={subCategory.id}
                            value={subCategory.id}
                          >
                            {getSubCategoryName(subCategory, subCategories)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="warranty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warranty</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={loading}
                      placeholder="Warranty information (e.g., 1 year)"
                    />
                  </FormControl>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expressDelivery"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                  <div className="space-y-1 leading-none">
                    <FormLabel>Express Delivery</FormLabel>
                    <FormDescription>
                      Enable express delivery for this product
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isNewArrival"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                  <div className="space-y-1 leading-none">
                    <FormLabel>New Arrival</FormLabel>
                    <FormDescription>
                      This product will be marked as a new arrival
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                  <div className="space-y-1 leading-none">
                    <FormLabel>Featured</FormLabel>
                    <FormDescription>
                      This product will appear on the home page
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isArchieved"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                  <div className="space-y-1 leading-none">
                    <FormLabel>Archieved</FormLabel>
                    <FormDescription>
                      This product will not be visible to customers
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="sizeAndFit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size and Fit</FormLabel>
                <FormControl>
                  <ProductFeatures
                    value={field.value || []}
                    disabled={loading}
                    onChange={(value) =>
                      field.onChange([...(field.value || []), value])
                    }
                    onRemove={(value) =>
                      field.onChange(
                        (field.value || []).filter((data) => data !== value)
                      )
                    }
                  />
                </FormControl>
                <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="materialAndCare"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material and Care</FormLabel>
                <FormControl>
                  <ProductFeatures
                    value={field.value || []}
                    disabled={loading}
                    onChange={(value) =>
                      field.onChange([...(field.value || []), value])
                    }
                    onRemove={(value) =>
                      field.onChange(
                        (field.value || []).filter((data) => data !== value)
                      )
                    }
                  />
                </FormControl>
                <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="enabledFeatures"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enabled Features</FormLabel>
                <FormControl>
                  <ProductFeatures
                    value={field.value || []}
                    disabled={loading}
                    onChange={(value) =>
                      field.onChange([...(field.value || []), value])
                    }
                    onRemove={(value) =>
                      field.onChange(
                        (field.value || []).filter((data) => data !== value)
                      )
                    }
                  />
                </FormControl>
                <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="specifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specifications</FormLabel>
                <FormControl>
                  <SpecificationInput
                    value={field.value || []}
                    disabled={loading}
                    specificationFields={specificationFields}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="variants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variants</FormLabel>
                <FormControl>
                  <VariantForm
                    value={field.value}
                    onChange={field.onChange}
                    sizes={sizes}
                    colors={colors}
                    locations={locations}
                  />
                </FormControl>
                <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading}>
            {actions}
          </Button>
        </form>
      </Form>
    </>
  );
};
