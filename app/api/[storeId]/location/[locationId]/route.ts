import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { storeId: string; locationId: string } }
) {
  try {
    const session = await auth();
    const { pincode, city, state, country, isCodAvailable, deliveryDays } =
      await request.json();

    if (!session || !session.user || !session.user.id) {
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

    if (!deliveryDays || deliveryDays.length === null) {
      return new NextResponse("Delivery days are required", { status: 400 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    if (!params.locationId) {
      return new NextResponse("Location Id is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    const location = await db.location.updateMany({
      where: {
        id: params.locationId,
      },
      data: {
        pincode,
        city,
        state,
        country,
        isCodAvailable,
        deliveryDays,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.log("[LOCATION_PATCH]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
export async function DELETE(
  _request: Request,
  { params }: { params: { storeId: string; locationId: string } }
) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized Access", { status: 401 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    if (!params.locationId) {
      return new NextResponse("Location Id is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    const location = await db.location.deleteMany({
      where: {
        id: params.locationId,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.log("[LOCATION_DELETE]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { locationId: string } }
) {
  try {
    if (!params.locationId) {
      return new NextResponse("Location Id is required", { status: 400 });
    }

    const location = await db.location.findUnique({
      where: {
        id: params.locationId,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.log("[LOCATION_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
