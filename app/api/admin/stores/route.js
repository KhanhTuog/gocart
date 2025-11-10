import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/admin";
import { auth, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);    
        const isAdmin = await authAdmin(userId);
        if(!isAdmin){
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        const stores = await prisma.store.findMany({
            where: {
                status: 'approved'
            },
            include: { user: true }
        });
        return NextResponse.json({ stores });
    }catch (error) {
        console.error( error);
        return NextResponse.json({error: error.code || error.message }, { status: 400 });
    }
}
export async function POST(request) {
    try {
        const { userId } = getAuth(request);   
         const isAdmin = await authAdmin(userId);
        if(!isAdmin){
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        } 
        const {storeId} = await request.json()
        const store = await prisma.store.findUnique({
            where: { id: storeId }   
        })
        if(!store){
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }
        //toogle isActive
        const updateStore = await prisma.store.update({
            where: { id: storeId },
            data: { isActive: !store.isActive }
        })
        return NextResponse.json({ message: `Store ${updateStore.isActive ? 'activated' : 'deactivated'} successfully` });

    }catch (error) {
        console.error( error);
        return NextResponse.json({error: error.code || error.message }, { status: 400 });
    }
}

