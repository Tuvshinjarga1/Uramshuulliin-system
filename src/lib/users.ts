import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { User } from "@/types";

// Бүх хэрэглэгчдийг авах
export async function getAllUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));

    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push({
        uid: doc.id,
        ...doc.data(),
      } as User);
    });

    return { success: true, users };
  } catch (error) {
    console.error("Error getting users:", error);
    return {
      success: false,
      error: "Хэрэглэгчдийн мэдээлэл авахад алдаа гарлаа",
    };
  }
}

// Хэрэглэгчийн мэдээлэл авах
export async function getUser(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));

    if (userDoc.exists()) {
      return {
        success: true,
        user: { uid: userId, ...userDoc.data() } as User,
      };
    } else {
      return { success: false, error: "Хэрэглэгчийн мэдээлэл олдсонгүй" };
    }
  } catch (error) {
    console.error("Error getting user:", error);
    return {
      success: false,
      error: "Хэрэглэгчийн мэдээлэл авахад алдаа гарлаа",
    };
  }
}
