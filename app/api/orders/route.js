// import prisma from "@/lib/prisma";
// import { getAuth } from "@clerk/nextjs/server";
// import { PaymentMethod } from "@prisma/client";
// import { parse } from "date-fns";
// import { NextResponse } from "next/server";


// export async function POST(request) {
//     try {
//         const {userId, has} = getAuth(request)
//         if(!userId){
//             return NextResponse.json({error: "Unauthorized"}, {status: 401})
//         }
//         const {addressId, items, couponCode,paymentMethod} = await request.json()

//         if(!addressId || !items || !Array.isArray(items) || !paymentMethod || items.length === 0){
//             return NextResponse.json({error: "Invalid order data"}, {status: 401})
//         }
//         let coupon = null
//         if(couponCode){
//             // Validate coupon code
//             coupon = await prisma.coupon.findUnique({
//                 where: {
//                     code: couponCode
//                 }
//             })
//             if(!coupon){
//                 return NextResponse.json({error: " coupon not found"}, {status: 400})
//             }
//         }
//         const isPlusMember = has({plan: 'plus'})
//         if(couponCode && coupon.forNewUser){
//             const userOrders = await prisma.order.findMany({where: {userId}})
//             if(userOrders.length > 0){
//                 return NextResponse.json({error: "Coupon valid for new users only"}, {status: 400})
//             }
//         }

//         //get orders by storeId using a map
//         const ordersByStore = new Map()
//         for (const item of items){
//             const product = await prisma.product.findUnique({
//                 where: {id: item.id}
//             })
//             const storeId = product.storeId
//             if(!ordersByStore.has(storeId)){
//                 ordersByStore.set(storeId, [])
//             }
//             ordersByStore.get(storeId).push({...item, price: product.price}) 
//         }
//         let orderId = [];
//         let fullAmount = 0
        
//         let isShippingFreeAdded = false;

//         //create orders for each seller
//         for (const [storeId, sellerItems] of ordersByStore.entries()){
//             let total = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)

//             if(couponCode){
//                 total -= (total * coupon.discount) / 100;
//             }
//             if(isPlusMember && !isShippingFreeAdded){
//                 total += 1;
//                 isShippingFreeAdded = true;
//             }
//             fullAmount += parseFloat(total.toFixed(2));

//             const order = await prisma.order.create({
//                 data: {
//                     userId, 
//                     storeId,
//                     addressId,
//                     total: parseFloat(total.toFixed(2)),
//                     paymentMethod,
//                     isCouponUsed: coupon ? true : false,
//                     coupon: coupon ? coupon.code : {},
//                     orderItems: {create: sellerItems.map(item => ({
//                         productId: item.id,
//                         quantity: item.quantity,    
//                         price: item.price
//                     }))}
//                 }
//             })
//             orderId.push(order.id)
//         }

//         // clear the cart 
//         await prisma.user.update({
//             where: {id: userId},
//             data : {cart: {}}
//         })
//         return NextResponse.json({message: "Order placed successfull"})
        
//     } catch (error) {
//         console.error(error)
//         return NextResponse.json({error:error.code || error.message},{status:400})
//     }
// }

// // get all orders for user 
// export async function GET(request) {
//     try {
//         const {userId} = getAuth(request)
//         const orders = await prisma.order.findMany({
//             where:{userId,OR: [
//                 {paymentMethod: paymentMethod.COD},
//                 {AND: [{paymentMethod: paymentMethod.STRIPE},{isPaid:true}]}
//             ]},
//             include:{
//                 orderItems:{include:{product:true}},
//                 address: true
//             },
//             orderBy : {createdAt: 'desc'}
//         }) 

//         return NextResponse.json({orders})
//     } catch (error) {
//         console.error(error)
//         return NextResponse.json({error:error.code || error.message},{status:400})
//     }
// }
import { metadata } from "@/app/layout";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// POST: Tạo đơn hàng
export async function POST(request) {
    try {
        const { userId, has } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { addressId, items, couponCode, paymentMethod } = await request.json();

        // Validate dữ liệu
        if (!addressId || !items || !Array.isArray(items) || items.length === 0 || !paymentMethod) {
            return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
        }

        let coupon = null;
        if (couponCode) {
            coupon = await prisma.coupon.findUnique({
                where: { code: couponCode }
            });
            if (!coupon) {
                return NextResponse.json({ error: "Coupon not found" }, { status: 400 });
            }
        }

        const isPlusMember = has({ plan: 'plus' });

        // Kiểm tra coupon cho người dùng mới
        if (couponCode && coupon?.forNewUser) {
            const userOrders = await prisma.order.findMany({ where: { userId } });
            if (userOrders.length > 0) {
                return NextResponse.json({ error: "Coupon valid for new users only" }, { status: 400 });
            }
        }

        // Gom đơn theo storeId
        const ordersByStore = new Map();
        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.id } });
            if (!product) {
                return NextResponse.json({ error: `Product not found: ${item.id}` }, { status: 400 });
            }
            const storeId = product.storeId;
            if (!ordersByStore.has(storeId)) ordersByStore.set(storeId, []);
            ordersByStore.get(storeId).push({ ...item, price: product.price });
        }

        let orderIds = [];
        let fullAmount = 0;
        let isShippingFreeAdded = false;

        // Tạo đơn hàng cho từng store
        for (const [storeId, sellerItems] of ordersByStore.entries()) {
            let total = sellerItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

            if (coupon) {
                total -= (total * coupon.discount) / 100;
            }
            if (!isPlusMember && !isShippingFreeAdded) {
                total += 1;
                isShippingFreeAdded = true;
            }

            fullAmount += parseFloat(total.toFixed(2));

            const order = await prisma.order.create({
                data: {
                    userId,
                    storeId,
                    addressId,
                    total: parseFloat(total.toFixed(2)),
                    paymentMethod,
                    isCouponUsed: !!coupon,
                    coupon: coupon ? { 
                        code: coupon.code, 
                        discount: coupon.discount,
                        forNewUser: coupon.forNewUser,
                        forMember: coupon.forMember
                    } : {},
                    orderItems: {
                        create: sellerItems.map(item => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                }
            });
            orderIds.push(order.id);
        }

        if(paymentMethod === 'STRIPE'){
            const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
            const origin = await request.headers.get('origin');

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Order`
                        },
                        unit_amount: Math.round(fullAmount * 100),
                    },
                    quantity: 1,   
                    }],
                    expires_at : Math.floor(Date.now() / 1000) + 30 * 60,
                    mode: 'payment',
                    success_url : `${origin}/loading?nextUrl=orders`,
                    cancel_url : `${origin}/cart`,
                    metadata: { 
                        orderIds: orderIds.join(',') , 
                        userId,
                        appId: 'gocart'
                    }
                })
                return NextResponse.json({session});
        }
    
        // Xóa giỏ hàng người dùng
        await prisma.user.update({
            where: { id: userId },
            data: { cart: {} }
        });

        return NextResponse.json({ message: "Order placed successfully", orderIds, fullAmount });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// GET: Lấy tất cả đơn hàng của user
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orders = await prisma.order.findMany({
            where: {
                userId,
                OR: [
                    { paymentMethod: PaymentMethod.COD },
                    { AND: [{ paymentMethod: PaymentMethod.STRIPE }, { isPaid: true }] }
                ]
            },
            include: {
                orderItems: { include: { product: true } },
                address: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ orders });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
