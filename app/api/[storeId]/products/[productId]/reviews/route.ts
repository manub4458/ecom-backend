import { db } from "@/lib/db";
import { ReviewSchema } from "@/schemas/review-form-schema";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { productId: string } }
) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin":
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      "http://localhost:3000" ||
      "http://localhost:3001" ||
      "https://favobliss.vercel.app",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  try {
    const body = await request.json();
    const validatedData = ReviewSchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse(
        JSON.stringify({ errors: validatedData.error.format() }),
        { status: 400, headers }
      );
    }

    const {
      userName,
      rating,
      text,
      images = [],
      videos = [],
      userId,
      categoryRatings = [],
    } = validatedData.data;

    if (!params.productId) {
      return new NextResponse("Product ID is required", {
        status: 400,
        headers,
      });
    }

    const product = await db.product.findUnique({
      where: { id: params.productId },
      include: {
        subCategory: {
          select: {
            reviewCategories: true,
          },
        },
      },
    });

    if (!product) {
      return new NextResponse("Product does not exist", {
        status: 404,
        headers,
      });
    }

    // Validate category ratings
    const validCategories =
      product.subCategory?.reviewCategories.map((cat: any) => cat.name) || [];
    const invalidCategories = categoryRatings.filter(
      (cr: { categoryName: string; rating: number }) =>
        !validCategories.includes(cr.categoryName) ||
        cr.rating < 1 ||
        cr.rating > 5
    );

    if (invalidCategories.length > 0) {
      return new NextResponse("Invalid category ratings", {
        status: 400,
        headers,
      });
    }

    const review = await db.review.create({
      data: {
        productId: params.productId,
        userName,
        userId,
        rating,
        text,
        images: {
          create: images.map((url) => ({ url })),
        },
        videos: {
          create: videos.map((url) => ({ url })),
        },
        categoryRatings: {
          create: categoryRatings.map(
            (cr: { categoryName: string; rating: number }) => ({
              categoryName: cr.categoryName,
              rating: cr.rating,
            })
          ),
        },
      },
      include: {
        images: true,
        videos: true,
        categoryRatings: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(review, { headers });
  } catch (error: any) {
    console.log("[REVIEWS_POST]", error);
    return new NextResponse("Internal server error", { status: 500, headers });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin":
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      "http://localhost:3001" ||
      "https://favobliss.vercel.app",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  try {
    if (!params.productId) {
      return new NextResponse("Product ID is required", {
        status: 400,
        headers,
      });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const skip = (page - 1) * limit;

    const reviews = await db.review.findMany({
      where: {
        productId: params.productId,
      },
      include: {
        images: true,
        videos: true,
        categoryRatings: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    });

    return NextResponse.json(reviews, { headers });
  } catch (error) {
    console.log("[REVIEWS_GET]", error);
    return new NextResponse("Internal server error", { status: 500, headers });
  }
}

// export async function GET_AVERAGE_RATINGS(
//   request: Request,
//   { params }: { params: { productId: string } }
// ) {
//   // Set CORS headers
//   const headers = {
//     "Access-Control-Allow-Origin":
//       process.env.NEXT_PUBLIC_FRONTEND_URL ||
//       "http://localhost:3000" ||
//       "http://localhost:3001" ||
//       "https://favobliss.vercel.app",
//     "Access-Control-Allow-Methods": "GET, OPTIONS",
//     "Access-Control-Allow-Headers": "Content-Type",
//   };

//   // Handle preflight OPTIONS request
//   if (request.method === "OPTIONS") {
//     return new NextResponse(null, { status: 204, headers });
//   }

//   try {
//     if (!params.productId) {
//       return new NextResponse("Product ID is required", {
//         status: 400,
//         headers,
//       });
//     }

//     const product = await db.product.findUnique({
//       where: { id: params.productId },
//       include: {
//         subCategory: {
//           select: {
//             reviewCategories: true,
//           },
//         },
//       },
//     });

//     if (!product) {
//       return new NextResponse("Product does not exist", {
//         status: 404,
//         headers,
//       });
//     }

//     const reviews = await db.review.findMany({
//       where: {
//         productId: params.productId,
//       },
//       include: {
//         categoryRatings: true,
//       },
//     });

//     const categoryRatingsMap: { [key: string]: { total: number; count: number } } = {};

//     reviews.forEach((review) => {
//       review.categoryRatings.forEach((cr) => {
//         if (!categoryRatingsMap[cr.categoryName]) {
//           categoryRatingsMap[cr.categoryName] = { total: 0, count: 0 };
//         }
//         categoryRatingsMap[cr.categoryName].total += cr.rating;
//         categoryRatingsMap[cr.categoryName].count += 1;
//       });
//     });

//     const averageRatings = Object.keys(categoryRatingsMap).map((categoryName) => ({
//       categoryName,
//       averageRating: categoryRatingsMap[categoryName].count
//         ? Number(
//             (
//               categoryRatingsMap[categoryName].total /
//               categoryRatingsMap[categoryName].count
//             ).toFixed(2)
//           )
//         : 0,
//     }));

//     return NextResponse.json(averageRatings, { headers });
//   } catch (error) {
//     console.log("[AVERAGE_RATINGS_GET]", error);
//     return new NextResponse("Internal server error", { status: 500, headers });
//   }
// }
