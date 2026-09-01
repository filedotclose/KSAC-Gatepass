import { cookies } from "next/headers";
import { verifyAccessToken } from "./jwt";
import { connectDB } from "./db";
import User  from "@/models/User";
import {IUser} from "@/types/user"
export async function getUserFromToken() : Promise<IUser | null> {
  try {
    const cookieStore = await cookies();
    const token =  cookieStore.get("accessToken")?.value;

    if (!token) return null;

    const decoded: any = verifyAccessToken(token);

    await connectDB();
    const user = await User.findById(decoded.id).select("-passwordHash");

    if (!user) return null;

    const userObj = user.toObject();
    return {
      _id: userObj._id.toString(),
      name: userObj.name,
      rollNo: userObj.rollNo,
      email: userObj.email,
      role: userObj.role,
    } as IUser;
  } catch {
    return null;
  }
}
