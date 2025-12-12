import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username')?.toLowerCase();

        if (!username) {
            return NextResponse.json({ error: 'Missing store username' }, { status: 400 });
        }

        const store = await prisma.store.findUnique({
            where: { username, isActive: true },
            include: {
                Product: {
                    where: { inStock: true },
                    include: { rating: true } // match schema
                }
            }
        });

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        // ✅ Return store nếu tìm thấy
        return NextResponse.json({ store }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
    }
}
