import { type ClassValue, clsx } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const copyToClipboard = (text: string, message?: string) => {
  navigator.clipboard.writeText(text);
  if (message) {
    toast.info(message);
  }
};

export const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

import { db } from "@/lib/db";

export async function generateOrderNumber(
  index: number = Math.floor(Math.random() * 1000)
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hour = now.getHours().toString().padStart(2, "0");

  const base = `${year}${month}${day}${hour}`.slice(0, 4);
  const suffix = (index % 1000).toString().padStart(3, "0");
  let orderNumber = `${base}${suffix}`;

  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    const existingOrder = await db.order.findUnique({
      where: { orderNumber },
    });

    isUnique = !existingOrder;
    attempts++;
    if (!isUnique) {
      console.warn(
        `Order number ${orderNumber} already exists, retrying... (Attempt ${attempts})`
      );
      const newIndex = Math.floor(Math.random() * 1000);
      const newSuffix = (newIndex % 1000).toString().padStart(3, "0");
      orderNumber = `${base}${newSuffix}`;
    }
  } while (!isUnique && attempts < maxAttempts);

  if (!isUnique) {
    console.error(
      "Failed to generate a unique order number after maximum attempts"
    );
    throw new Error(
      "Failed to generate a unique order number after maximum attempts"
    );
  }

  return orderNumber;
}
