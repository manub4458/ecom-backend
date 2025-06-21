"use client";

import * as z from "zod";
import { useState, useEffect } from "react";
import { SubCategory, Category, BillBoard } from "@prisma/client";
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
import { SubCategorySchema } from "@/schemas/subcategory-form-schema";

interface SubCategoryFormProps {
  initialData: SubCategory | null;
  categories: Category[];
  billboards: BillBoard[];
  subCategories: SubCategory[];
}

export const SubCategoryForm = ({
  initialData,
  categories,
  billboards,
  subCategories,
}: SubCategoryFormProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const router = useRouter();

  const title = initialData ? "Edit Subcategory" : "Create Subcategory";
  const description = initialData
    ? "Edit a subcategory"
    : "Add a new subcategory";
  const toastMessage = initialData
    ? "Subcategory updated."
    : "Subcategory created.";
  const action = initialData ? "Save Changes" : "Create";

  const form = useForm<z.infer<typeof SubCategorySchema>>({
    resolver: zodResolver(SubCategorySchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          slug: initialData.slug || "",
          billboardId: initialData.billboardId,
          bannerImage: initialData.bannerImage,
          categoryId: initialData.categoryId,
          parentId: initialData.parentId || undefined,
        }
      : {
          name: "",
          slug: "",
          billboardId: "",
          bannerImage: "",
          categoryId: "",
          parentId: undefined,
        },
  });

  const { watch, setValue } = form;
  const parentId = watch("parentId");

  // Prefill categoryId based on parentId
  useEffect(() => {
    if (parentId && parentId !== "none") {
      const parentSubCategory = subCategories.find(
        (sub) => sub.id === parentId
      );
      if (parentSubCategory) {
        setValue("categoryId", parentSubCategory.categoryId);
      }
    }
  }, [parentId, subCategories, setValue]);

  const onSubmit = async (values: z.infer<typeof SubCategorySchema>) => {
    try {
      setLoading(true);

      // Validate parentId to prevent cycles
      if (values.parentId && initialData?.id === values.parentId) {
        toast.error("A subcategory cannot be its own parent.");
        return;
      }

      // Map "none" to null for parentId
      const submitValues = {
        ...values,
        parentId: values.parentId === "none" ? null : values.parentId,
      };

      if (initialData) {
        await axios.patch(
          `/api/${params.storeId}/subcategories/${params.subCategoryId}`,
          submitValues
        );
      } else {
        await axios.post(`/api/${params.storeId}/subcategories`, submitValues);
      }
      router.refresh();
      router.push(`/${params.storeId}/subcategories`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.log("[SUBCATEGORY_FORM]", error);
      if (
        error.response?.status === 400 &&
        error.response?.data === "Slug already exists"
      ) {
        form.setError("slug", {
          type: "manual",
          message: "Slug already exists. Please choose a different slug.",
        });
      } else {
        toast.error("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(
        `/api/${params.storeId}/subcategories/${params.subCategoryId}`
      );
      router.refresh();
      router.push(`/${params.storeId}/subcategories`);
      toast.success("Subcategory deleted.");
    } catch (error) {
      console.log("[SUBCATEGORY_DELETE]", error);
      toast.error(
        "Make sure to remove all products using this subcategory first."
      );
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

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
        {initialData && (
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
                      placeholder="Subcategory name"
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
                      placeholder="Subcategory slug"
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
              name="billboardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billboard</FormLabel>
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
                          placeholder="Select a billboard"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {billboards.map((billboard) => (
                        <SelectItem key={billboard.id} value={billboard.id}>
                          {billboard.label}
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
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    //@ts-ignore
                    disabled={loading || (parentId && parentId !== "none")}
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
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Subcategory</FormLabel>
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
                          placeholder="Select a parent subcategory (optional)"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {subCategories
                        .filter((sub) => sub.id !== initialData?.id)
                        .map((subCategory) => (
                          <SelectItem
                            key={subCategory.id}
                            value={subCategory.id}
                          >
                            {subCategory.name}
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
              name="bannerImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banner Image</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value ? [field.value] : []}
                      disabled={loading}
                      onChange={(url) => field.onChange(url)}
                      onRemove={() => field.onChange("")}
                    />
                  </FormControl>
                  <FormMessage className="w-full px-2 py-2 bg-destructive/20 text-destructive/70 rounded-md" />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};
