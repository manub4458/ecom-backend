"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { BrandColumn } from "./columns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";
import { Copy, Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { AlertModal } from "@/components/modals/alert-modal";
import { copyToClipboard } from "@/lib/utils";

interface BrandCellActionsProps {
  data: BrandColumn;
}

export const BrandCellActions = ({ data }: BrandCellActionsProps) => {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.storeId}/brands/${data.id}`);
      router.refresh();
      toast.success("Brand deleted");
    } catch (error) {
      console.error(error);
      toast.error(
        "Make sure no products are using this brand before deleting."
      );
    } finally {
      setOpen(false);
      setLoading(false);
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="mx-2">Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              copyToClipboard(data.id, "Brand ID is copied to clipboard")
            }
          >
            <Copy className="h-4 w-4 mr-4" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/${params.storeId}/brands/${data.id}`)}
          >
            <Edit className="h-4 w-4 mr-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled={loading} onClick={() => setOpen(true)}>
            <Trash2 className="h-4 w-4 mr-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
