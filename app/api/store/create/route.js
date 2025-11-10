// import { getAuth } from "@clerk/nextjs/server";
// import  { NextResponse  } from "next/server";
// import prisma from "@/lib/prisma";
// import imagekit from "@/configs/imageKit";

// // import authSeller from "@/middlewares/authSellers"; 


// // create the store
// export async function POST(request) {
//  try {
//         const { userId } = getAuth(request);
        
//         //get the data from the form 
//         const formData = await request.formData();

//         const name = formData.get("name");
//         const username = formData.get("username");
//         const description = formData.get("description");
//         const email = formData.get("email");
//         const contact = formData.get("contact");
//         const address = formData.get("address");
//         const image = formData.get("image");

//         if( !name || !username || !description || !email || !contact || !address || !image ){
//         return NextResponse.json({ error: 'Misssing store inf' }, { status: 400 });
//         }

//         // check if the user already has a store
//         const store = await prisma.store.findFirst({
//             where: { userId:userId }
//         })

//         //if store is already registered then send status of store
//         // Lấy header content-type để phân biệt request
//     const contentType = request.headers.get("content-type") || "";

//     // 👉 Nếu request không có form-data (FE chỉ muốn check status)
//         if (!contentType.includes("multipart/form-data")) {
//             if (store) {
//                 return NextResponse.json({ status: store.status });
//             } else {
//                 return NextResponse.json({ status: "not_found" });
//             }
//         }
        
//         // check is username is already taken
//         const isUsernameTaken = await prisma.store.findFirst({
//             where: { username: username.toLowerCase() }
//         })
//         if(isUsernameTaken){
//             return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
//         }

//         // image upload to imagekit
//         const buffer = Buffer.from( await image.arrayBuffer());
//         const response = await imagekit.upload({
//             file : buffer,
//             fileName : image.name,
//             folder : "logos"
//         })

//         const optimizedImage = imagekit.url({
//             path : response.filePath,
//             transformation : [
//                 { quality: 'auto'},
//                 { format: 'webp' },
//                 { width: '512' }
//             ]      
//         })

//         const newStore = await prisma.store.create({
//             data: {
//                 userId,
//                 name,
//                 description,
//                 username: username.toLowerCase(),
//                 email,
//                 contact,
//                 address,
//                 logo: optimizedImage,
//             }
//         })
//         //link store to user
//         await prisma.user.update({
//             where: { id: userId },
//             data: { store: { connect : { id: newStore.id } } }
//         })
        
//         return NextResponse.json({ message: "applied, waiting for  approval" });

//     } catch (error) {
//      console.error('Error creating store:', error);
//      return NextResponse.json({error: error.code || error.message }, { status: 400 });
//     } 
// }

// // check user  have registered store or not
// export async function GET(request) {
//     try {   
//         const { userId } = getAuth(request);

//         const store = await prisma.store.findFirst({
//             where: { userId:userId }
//         })
//         //if store is already registered then send status of store
//         if(store){
//             return NextResponse.json({ status: store.status});
//         } 

//         return NextResponse.json({ status: "not-registered" });
//     } catch (error) {
//         console.error('Error fetching store:', error);
//         return NextResponse.json({error: error.code || error.message }, { status: 400 });
//     }
// }
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import imagekit from "@/configs/imageKit";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lấy header Content-Type để phân biệt request
    const contentType = request.headers.get("content-type") || "";

    // 👉 Nếu FE chỉ gọi để kiểm tra trạng thái (fetchSellerStatus)
    if (!contentType.includes("multipart/form-data")) {
      const store = await prisma.store.findFirst({
        where: { userId },
      });

      if (store) {
        return NextResponse.json({ status: store.status });
      } else {
        return NextResponse.json({ status: "not_found" });
      }
    }

    // 👉 Nếu FE gửi formData thực sự (submit form)
    const formData = await request.formData();

    const name = formData.get("name");
    const username = formData.get("username");
    const description = formData.get("description");
    const email = formData.get("email");
    const contact = formData.get("contact");
    const address = formData.get("address");
    const image = formData.get("image");

    // Kiểm tra dữ liệu thiếu
    if (!name || !username || !description || !email || !contact || !address || !image) {
      return NextResponse.json({ error: "Missing store information" }, { status: 400 });
    }

    // Kiểm tra user đã có store chưa
    const existingStore = await prisma.store.findFirst({
      where: { userId },
    });

    if (existingStore) {
      return NextResponse.json({ error: "You already have a store." }, { status: 400 });
    }

    // Kiểm tra username đã tồn tại chưa
    const isUsernameTaken = await prisma.store.findFirst({
      where: { username: username.toLowerCase() },
    });

    if (isUsernameTaken) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    // Upload ảnh lên ImageKit
    const buffer = Buffer.from(await image.arrayBuffer());
    const response = await imagekit.upload({
      file: buffer,
      fileName: image.name,
      folder: "logos",
    });

    // Tạo URL ảnh tối ưu
    const optimizedImage = imagekit.url({
      path: response.filePath,
      transformation: [
        { quality: "auto" },
        { format: "webp" },
        { width: "512" },
      ],
    });

    // Tạo store mới
    const newStore = await prisma.store.create({
      data: {
        userId,
        name,
        description,
        username: username.toLowerCase(),
        email,
        contact,
        address,
        logo: optimizedImage,
        status: "pending",
      },
    });

    return NextResponse.json({
      message: "Store created successfully, waiting for admin approval",
      status: newStore.status,
    });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ✅ API GET để lấy status thủ công (nếu cần)
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const store = await prisma.store.findFirst({
      where: { userId },
    });

    if (store) {
      return NextResponse.json({ status: store.status });   
    }

    return NextResponse.json({ status: "not_registered" });
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
