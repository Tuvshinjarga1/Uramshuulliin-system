"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { getTask, updateTask } from "@/lib/tasks";
import { Task, User } from "@/types";
import { logoutUser } from "@/lib/auth";

interface TaskFormData {
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  incentiveAmount: number;
}

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TaskFormData>({
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      dueDate: new Date().toISOString().split("T")[0],
      incentiveAmount: 0,
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Хэрэглэгчийн профайл авах
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Зөвхөн админ хэрэглэгч нэвтрэх эрхтэй
          if (userData.role === "admin") {
            setCurrentUser({ uid: user.uid, ...userData });

            // Бүх хэрэглэгчдийн жагсаалт авах
            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersData = usersSnapshot.docs.map((doc) => ({
              uid: doc.id,
              ...doc.data(),
            })) as User[];

            // Зөвхөн ажилтнуудын жагсаалт шүүх
            const employeesOnly = usersData.filter(
              (u) => u.role === "employee"
            );
            setUsers(employeesOnly);

            // Даалгаврын мэдээлэл авах
            const taskResult = await getTask(taskId);
            if (taskResult.success && taskResult.task) {
              const task = taskResult.task as Task;
              const dueDate =
                task.dueDate instanceof Date
                  ? task.dueDate.toISOString().split("T")[0]
                  : new Date(task.dueDate.toDate()).toISOString().split("T")[0];

              reset({
                title: task.title,
                description: task.description,
                assignedTo: task.assignedTo,
                dueDate: dueDate,
                incentiveAmount: task.incentiveAmount,
              });
            } else {
              setError("Даалгаврын мэдээлэл авахад алдаа гарлаа");
            }
          } else {
            // Админ биш хэрэглэгч
            await logoutUser();
            router.push("/login");
          }
        } else {
          // Хэрэглэгчийн мэдээлэл олдсонгүй
          await logoutUser();
          router.push("/login");
        }
      } else {
        // Нэвтрээгүй үед нэвтрэх хуудас руу шилжүүлэх
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, taskId, reset]);

  const onSubmit = async (data: TaskFormData) => {
    setSubmitLoading(true);
    setError(null);

    try {
      // Даалгавар шинэчлэх
      const taskData = {
        ...data,
        dueDate: new Date(data.dueDate),
        incentiveAmount: Number(data.incentiveAmount),
        updatedAt: new Date(),
      };

      const result = await updateTask(taskId, taskData);

      if (result.success) {
        router.push(`/admin/tasks/${taskId}`);
      } else {
        setError(result.error || "Даалгавар шинэчлэхэд алдаа гарлаа");
      }
    } catch (error: any) {
      setError(error.message || "Даалгавар шинэчлэхэд алдаа гарлаа");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/admin/tasks/${taskId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Ачаалж байна...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Даалгавар засах</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push(`/admin/tasks/${taskId}`)}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white rounded-md border border-blue-600 hover:bg-blue-50"
            >
              Буцах
            </button>
            <div className="text-sm font-medium text-gray-600">
              {currentUser?.displayName} (Админ)
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="title"
              >
                Гарчиг
              </label>
              <input
                id="title"
                type="text"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register("title", { required: "Гарчиг оруулна уу" })}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="description"
              >
                Тайлбар
              </label>
              <textarea
                id="description"
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register("description", { required: "Тайлбар оруулна уу" })}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="assignedTo"
              >
                Ажилтан
              </label>
              <select
                id="assignedTo"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register("assignedTo", { required: "Ажилтан сонгоно уу" })}
              >
                <option value="">Сонгоно уу</option>
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName} ({user.email})
                  </option>
                ))}
              </select>
              {errors.assignedTo && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.assignedTo.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="dueDate"
                >
                  Дуусах хугацаа
                </label>
                <input
                  id="dueDate"
                  type="date"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  {...register("dueDate", {
                    required: "Дуусах хугацаа оруулна уу",
                  })}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="incentiveAmount"
                >
                  Урамшуулал (₮)
                </label>
                <input
                  id="incentiveAmount"
                  type="number"
                  min="0"
                  step="1000"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  {...register("incentiveAmount", {
                    required: "Урамшууллын дүн оруулна уу",
                    min: {
                      value: 0,
                      message: "Урамшууллын дүн 0 эсвэл түүнээс их байх ёстой",
                    },
                  })}
                />
                {errors.incentiveAmount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.incentiveAmount.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                Цуцлах
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 ${
                  submitLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {submitLoading ? "Хадгалж байна..." : "Хадгалах"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
