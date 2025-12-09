import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

//add new address
export async function POST(request) {
  try {
    const {userId} = getAuth(request);
    const address=  await request.json();  
    if (!address) return NextResponse.json({ error: 'Address is required' }, { status: 400 });

    address.userId = userId;

    // save the cart  to the user object
    const newAddress = await prisma.address.create({
      data: address
    });
  
    return NextResponse.json({ newAddress,message: 'Address add successful' });
  }catch (error) {  
    console.error('Error updating cart:', error);
    return NextResponse.json({error: error.code || error.message}, { status: 400 });
  }
}

// get all address
export async function GET(request) {
  try {
    const {userId} = getAuth(request);
  
    const addresses = await prisma.address.findMany({
      where: { userId}
    });
  
    return NextResponse.json({ addresses });
  }catch (error) {  
    console.error('Error updating cart:', error);
    return NextResponse.json({error: error.code || error.message}, { status: 400 });
  }
}