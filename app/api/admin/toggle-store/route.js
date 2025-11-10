import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/admin";
import { auth, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

//toggle store active status
export async function GET(request) {
    try {
        const { userId } = getAuth(request);    
        const isAdmin = await authAdmin(userId);
        if(!isAdmin){
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        // const {storeID} = await request.json()
        const { searchParams } = new URL(request.url);
        const storeID = searchParams.get("storeID");
        if (!storeID) {
            return NextResponse.json({ error: "missing store id" }, { status: 400 });
        } 
        // find the store
        const store = await prisma.store.findUnique({
            where: { id: storeID }
        });
        if (!store) {
            return NextResponse.json({ error: "store not found" }, { status: 404 });
        }
        await prisma.store.update({
            where: { id: storeID },
            data: { isActive: !store.isActive }
        });
        return NextResponse.json({ message: "store status toggled successfully" });
    }catch (error) {
        console.error( error);
        return NextResponse.json({error: error.code || error.message }, { status: 400 });
    }
}
