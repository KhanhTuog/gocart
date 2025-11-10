import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import authSeller from "@/middlewares/authSellers";

// get store inf and store products
async function POST(request) {
    try {
        // get store username  from query params
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username').toLowerCase();

        if(!username){
            return NextResponse.json({ error: 'Missing store username' }, { status: 400 });
        }

        //get store info and stock products with ratings
        const store = await prisma.store.findUnique({
            where: { username, isActive : true },
            include: {
                products: { 
                    where: { inStock: true },
                    include: {  
                        ratings: true
                    } 
                }
            }
        })
        if(!store){
            return NextResponse.json({ error: 'Store not found' }, { status: 400 });
        }

    } catch (error) {
        console.error( error);
        return NextResponse.json({error: error.code || error.message }, { status: 400 });
    }
}