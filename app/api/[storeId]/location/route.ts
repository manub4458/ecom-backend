import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const { pincode, city, state, country, isCodAvailable } =
      await request.json();
    const session = await auth();

    if (!session) {
      return new NextResponse("Unauthorized Access", { status: 401 });
    }

    if (!pincode) {
      return new NextResponse("Pincode is required", { status: 400 });
    }

    if (!city) {
      return new NextResponse("City is required", { status: 400 });
    }

    if (!state) {
      return new NextResponse("State is required", { status: 400 });
    }

    if (!country) {
      return new NextResponse("Country is required", { status: 400 });
    }

    if (isCodAvailable === undefined || isCodAvailable === null) {
      return new NextResponse("Cash on Delivery availability is required", {
        status: 400,
      });
    }

    if (!params.storeId) {
      return new NextResponse("StoreId is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    const location = await db.location.create({
      data: {
        pincode,
        city,
        state,
        country,
        isCodAvailable,
        storeId: params.storeId,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.log("[LOCATION_POST]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}


