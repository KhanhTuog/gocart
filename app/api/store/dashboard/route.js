import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSellers";
import { getAuth } from "@clerk/nextjs/server";
import  { NextResponse  } from "next/server";

// get dashboard data for seller
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        //get all order for seller
        const orders = await prisma.order.findMany({
            where: { storeId }
        });

        //get all products with ratting for seller
        const products =  await prisma.product.findMany({
            where: { storeId },
        });

        const ratings = await prisma.rating.findMany({
            where: {
                productID: { in: products.map( (product) => product.id ) } 
            }, include: { user: true, products: true}
        });

        const dashboardData = {
            ratings,
            totalOrders: orders.length,
            totalEarnings: Math.round(orders.reduce( (acc, order) => acc + order.total, 0 )),
            totalProducts: products.length
        };  
        return NextResponse.json( dashboardData );
    } catch (error) {
        console.error( error);
        return NextResponse.json({error: error.code || error.message }, { status: 400 });
    }
}