import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSellers";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


//update seller order status
export async function POST(request) {
  try {
    const {userId} = getAuth(request);
    const storeId = await authSeller(userId);

    if (!storeId) {
      return  NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    }
    const {orderId, status}=  await request.json();

    await prisma.order.updateMany({
      where: {
        id: orderId, storeId},
        data: {
          status
        }
    });        

    return NextResponse.json({ message: 'Order status updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({error: error.code || error.message}, { status: 400 });
  }
}
//get all order for a seller
export async function GET(request) {
  try {
    const {userId} = getAuth(request);
    const storeId = await authSeller(userId);
    if (!storeId) {
      return  NextResponse.json({ message: 'Unauthorized' }, { status: 401 });      
    }
    const orders = await prisma.order.findMany({
      where: {storeId},
      include: {user: true, address: true, orderItems: {include: {product: true}}},
      orderBy: {createdAt: 'desc'}
    });
    return NextResponse.json({orders});
    }   catch (error) {
            console.error('Error updating order status:', error);
            return NextResponse.json({error: error.code || error.message}, { status: 400 });
    }   
}
        