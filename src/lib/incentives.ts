import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { Task } from "@/types";
import { getUserCompletedTasks } from "./tasks";
import { Incentive } from "@/types";

// Урамшууллын төрөл нэмэх
export const createIncentiveType = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, "incentiveTypes"), {
      ...data,
      createdAt: Timestamp.now(),
    });

    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Урамшууллын төрлүүдийг авах
export const getIncentiveTypes = async () => {
  try {
    const q = query(
      collection(db, "incentiveTypes"),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const types = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, types };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Урамшууллын төрөл шинэчлэх
export const updateIncentiveType = async (typeId: string, data: any) => {
  try {
    await updateDoc(doc(db, "incentiveTypes", typeId), {
      ...data,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Урамшууллын төрөл устгах
export const deleteIncentiveType = async (typeId: string) => {
  try {
    await deleteDoc(doc(db, "incentiveTypes", typeId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Урамшуулал бодох
export async function calculateIncentive(
  userId: string,
  month: string,
  year: string
) {
  try {
    // Тухайн сар жилийн аль хэдийн бодогдсон урамшуулал байгаа эсэхийг шалгах
    const incentivesRef = collection(db, "incentives");
    const checkQ = query(
      incentivesRef,
      where("userId", "==", userId),
      where("month", "==", month),
      where("year", "==", year)
    );
    const checkSnapshot = await getDocs(checkQ);

    if (!checkSnapshot.empty) {
      return {
        success: false,
        error: `${year} оны ${month}-р сарын урамшуулал аль хэдийн бодогдсон байна`,
      };
    }

    // Хэрэглэгчийн дууссан даалгавруудыг авах
    const tasksResult = await getUserCompletedTasks(userId, month, year);

    if (!tasksResult.success) {
      return {
        success: false,
        error: "Даалгаврын мэдээлэл авахад алдаа гарлаа",
      };
    }

    const tasks = tasksResult.tasks as Task[];

    if (tasks.length === 0) {
      return {
        success: false,
        error: `${year} оны ${month}-р сард дууссан даалгавар байхгүй байна`,
      };
    }

    // Нийт дүнг тооцоолох
    let totalAmount = 0;
    tasks.forEach((task) => {
      totalAmount += task.incentiveAmount;
    });

    // Урамшуулал үүсгэх
    const newIncentive = {
      userId,
      month,
      year,
      taskCount: tasks.length,
      totalAmount,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "incentives"), newIncentive);

    return {
      success: true,
      incentive: { id: docRef.id, ...newIncentive } as Incentive,
    };
  } catch (error) {
    console.error("Error calculating incentive:", error);
    return { success: false, error: "Урамшуулал тооцоолоход алдаа гарлаа" };
  }
}

// Хэрэглэгчийн урамшууллын мэдээлэл авах
export async function getUserIncentives(userId: string) {
  try {
    const incentivesRef = collection(db, "incentives");
    const q = query(incentivesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const incentives: Incentive[] = [];
    querySnapshot.forEach((doc) => {
      incentives.push({
        id: doc.id,
        ...doc.data(),
      } as Incentive);
    });

    return { success: true, incentives };
  } catch (error) {
    console.error("Error getting user incentives:", error);
    return {
      success: false,
      error: "Урамшууллын мэдээлэл авахад алдаа гарлаа",
    };
  }
}

// Бүх урамшууллын мэдээлэл авах
export async function getAllIncentives() {
  try {
    const incentivesRef = collection(db, "incentives");
    const querySnapshot = await getDocs(incentivesRef);

    const incentives: Incentive[] = [];
    querySnapshot.forEach((doc) => {
      incentives.push({
        id: doc.id,
        ...doc.data(),
      } as Incentive);
    });

    return { success: true, incentives };
  } catch (error) {
    console.error("Error getting all incentives:", error);
    return {
      success: false,
      error: "Бүх урамшууллын мэдээлэл авахад алдаа гарлаа",
    };
  }
}

// Урамшуулал батлах/цуцлах
export async function updateIncentiveStatus(
  incentiveId: string,
  status: "approved" | "rejected"
) {
  try {
    const incentiveRef = doc(db, "incentives", incentiveId);

    await updateDoc(incentiveRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating incentive status:", error);
    return {
      success: false,
      error: "Урамшууллын төлөв шинэчлэхэд алдаа гарлаа",
    };
  }
}
