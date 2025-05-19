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
import { FaPlus, FaTrash } from "react-icons/fa";

interface TaskFormData {
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  incentiveAmount: number;
  requirements: string; // We'll convert this to JSON string for storage
}

interface RequirementInput {
  id: string;
  field1: string; // шаардлага
  field2: string; // оноо эсвэл тайлбар
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

  const [inputs, setInputs] = useState<RequirementInput[]>([
    { id: crypto.randomUUID(), field1: "", field2: "" },
  ]);

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
      requirements: "",
    },
  });

  // Handler for input changes in dynamic requirements
  const handleChange = (id: string, field: "field1" | "field2", value: string) => {
    setInputs((prev) =>
      prev.map((input) =>
        input.id === id ? { ...input, [field]: value } : input
      )
    );
  };

  // Add new empty requirement input
  const handleAdd = () => {
    setInputs((prev) => [...prev, { id: crypto.randomUUID(), field1: "", field2: "" }]);
  };

  // Remove a requirement input by id
  const handleRemove = (id: string) => {
    if (inputs.length > 1) {
      setInputs((prev) => prev.filter((input) => input.id !== id));
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Хэрэглэгчийн профайл авах
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
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
                requirements: task.requirements || "", // хадгалсан requirements-ийг авах
              });

              // Хэрвээ requirements JSON форматаар хадгалагдсан бол inputs-д буцаан дамжуулах
              try {
                const reqs = task.requirements ? JSON.parse(task.requirements) : [];
                if (Array.isArray(reqs) && reqs.length > 0) {
                  setInputs(
                    reqs.map((r: any) => ({
                      id: crypto.randomUUID(),
                      field1: r.field1 || "",
                      field2: r.field2 || "",
                    }))
                  );
                }
              } catch {
                // JSON биш бол орхих
              }
            } else {
              setError("Даалгаврын мэдээлэл авахад алдаа гарлаа");
            }
          } else {
            await logoutUser();
            router.push("/login");
          }
        } else {
          await logoutUser();
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, taskId, reset]);

 const onSubmit = async (data: TaskFormData) => {
  setSubmitLoading(true);
  setError(null);

  if (!data.assignedTo) {
    setError("Даалгавар хариуцагчийг сонгоно уу");
    setSubmitLoading(false);
    return;
  }

  const filteredReqs = inputs.filter(i => i.field1.trim() !== "");

  if (filteredReqs.length === 0) {
    setError("Хамгийн багадаа нэг шаардлага оруулна уу");
    setSubmitLoading(false);
    return;
  }

  // Шаардлагын хувь нийлбэрийг тооцоолох
  const totalPercent = filteredReqs.reduce(
    (sum, item) => sum + Number(item.field2 || 0),
    0
  );

  // Яг 100% тэнцэх эсэхийг шалгах
  if (totalPercent !== 100) {
    setError(`Шаардлагуудын нийт хувь ${totalPercent}%. Нийт хувь заавал 100% байх ёстой.`);
    setSubmitLoading(false);
    return;
  }

    // Шаардлагуудыг JSON болгож хөрвүүлэх
    const requirementsJSON = JSON.stringify(inputs);

    try {
      const taskData = {
        ...data,
        dueDate: new Date(data.dueDate),
        incentiveAmount: Number(data.incentiveAmount),
        requirements: requirementsJSON,
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
              <label className="block mb-1 font-medium">Даалгаврын шаардлагууд</label>
              <div className="space-y-2">
                {inputs.map((input) => (
                  <div key={input.id} className="flex gap-2 items-center">
                    <input
                      value={input.field1}
                      onChange={(e) => handleChange(input.id, "field1", e.target.value)}
                      placeholder="Шаардлага"
                      className="border p-2 rounded w-1/2"
                    />
                    <input
  type="number"
  value={input.field2}
  onChange={(e) => handleChange(input.id, "field2", e.target.value)}
  placeholder="Хувиар (жишээ нь: 20)"
  min="0"
  max="100"
  className="border p-2 rounded w-1/2"
/>
                    <button type="button" onClick={handleAdd} className="text-green-600">
                      <FaPlus />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(input.id)}
                      disabled={inputs.length === 1}
                      className={`text-red-600 ${inputs.length === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="assignedTo"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Хариуцах хүн
              </label>
              <select
                id="assignedTo"
                className="block w-full border border-gray-300 rounded-md p-2"
                {...register("assignedTo", { required: "Хариуцах хүн заавал сонгоно уу" })}
              >
                <option value="">-- Сонгох --</option>
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName || user.email}
                  </option>
                ))}
              </select>
              {errors.assignedTo && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.assignedTo.message}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label
                htmlFor="dueDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Дуусах огноо
              </label>
              <input
                type="date"
                id="dueDate"
                className="block w-full border border-gray-300 rounded-md p-2"
                {...register("dueDate", { required: "Дуусах огноо заавал оруулна уу" })}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="incentiveAmount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Урамшууллын хэмжээ
              </label>
              <input
                type="number"
                id="incentiveAmount"
                className="block w-full border border-gray-300 rounded-md p-2"
                {...register("incentiveAmount", {
                  required: "Урамшууллын хэмжээ оруулна уу",
                  min: { value: 0, message: "Урамшуулал 0-с бага байж болохгүй" },
                })}
              />
              {errors.incentiveAmount && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.incentiveAmount.message}
                </p>
              )}
            </div>

            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                disabled={submitLoading}
              >
                Болих
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                disabled={submitLoading}
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
