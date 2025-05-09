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
} from "firebase/firestore";
import { Task } from "@/types";

// Даалгавар үүсгэх
export const createTask = async (taskData: any) => {
  try {
    const docRef = await addDoc(collection(db, "tasks"), {
      ...taskData,
      createdAt: Timestamp.now(),
      status: "pending", // pending, in-progress, completed, rejected
    });

    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Даалгавар авах
export const getTask = async (taskId: string) => {
  try {
    const taskDoc = await getDoc(doc(db, "tasks", taskId));

    if (taskDoc.exists()) {
      return { success: true, task: { id: taskDoc.id, ...taskDoc.data() } };
    } else {
      return { success: false, error: "Даалгавар олдсонгүй" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Хэрэглэгчийн даалгаврууд авах
export const getUserTasks = async (userId: string) => {
  try {
    console.log("Хэрэглэгчийн ID:", userId);

    const tasksRef = collection(db, "tasks");
    const q = query(tasksRef, where("assignedTo", "==", userId));

    const querySnapshot = await getDocs(q);
    console.log("Олдсон даалгаврын тоо:", querySnapshot.size);

    const tasks = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      console.log("Даалгаврын дэлгэрэнгүй:", { id: doc.id, ...data });
      return {
        id: doc.id,
        ...data,
      };
    });

    return { success: true, tasks };
  } catch (error: any) {
    console.error("Даалгавар авахад алдаа гарлаа:", error);
    return { success: false, error: error.message };
  }
};

// Бүх даалгавар авах (админ)
export const getAllTasks = async () => {
  try {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

    const querySnapshot = await getDocs(q);
    const tasks = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, tasks };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Даалгавар шинэчлэх
export const updateTask = async (taskId: string, data: any) => {
  try {
    await updateDoc(doc(db, "tasks", taskId), {
      ...data,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Даалгавар статус шинэчлэх
export const updateTaskStatus = async (
  taskId: string,
  status: string,
  comment: string = ""
) => {
  try {
    const updateData: any = {
      status,
      statusComment: comment,
      updatedAt: Timestamp.now(),
    };

    // Даалгаврыг дууссан гэж тэмдэглэх үед дууссан огноог хадгалах
    if (status === "completed") {
      updateData.completedAt = Timestamp.now();
    }

    await updateDoc(doc(db, "tasks", taskId), updateData);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Даалгавар устгах
export const deleteTask = async (taskId: string) => {
  try {
    await deleteDoc(doc(db, "tasks", taskId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Тухайн сард хэрэглэгчийн дууссан даалгавруудыг авах
export async function getUserCompletedTasks(
  userId: string,
  month: string,
  year: string
) {
  try {
    const tasksRef = collection(db, "tasks");
    const q = query(
      tasksRef,
      where("assignedTo", "==", userId),
      where("status", "==", "completed")
    );

    const querySnapshot = await getDocs(q);
    const tasks: Task[] = [];

    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      const taskDate =
        taskData.completedAt instanceof Timestamp
          ? taskData.completedAt.toDate()
          : new Date(taskData.completedAt);

      // Зөвхөн тухайн сарын даалгаврууд
      if (
        taskDate.getMonth() + 1 === parseInt(month) &&
        taskDate.getFullYear() === parseInt(year)
      ) {
        tasks.push({
          id: doc.id,
          ...taskData,
        } as Task);
      }
    });

    return { success: true, tasks };
  } catch (error) {
    console.error("Error getting completed tasks:", error);
    return { success: false, error: "Даалгаврын мэдээлэл авахад алдаа гарлаа" };
  }
}
