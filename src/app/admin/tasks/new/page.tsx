"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { createTask } from "@/lib/tasks";
import { logoutUser } from "@/lib/auth";
import { FaPlus, FaTrash } from "react-icons/fa";
import { User } from "@/types";

interface TaskFormData {
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  requirements: string; // JSON string
}

interface RequirementItem {
  id: number;
  field1: string; // Requirement
  field2: string; // Score or comment
}

export default function NewTaskPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inputs, setInputs] = useState<RequirementItem[]>([
    { id: 1, field1: "", field2: "" },
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
      requirements: "",
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === "admin") {
            setUser({ uid: currentUser.uid, ...userData });
            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersData = usersSnapshot.docs.map((doc) => ({
              uid: doc.id,
              ...doc.data(),
            })) as User[];
            const employeesOnly = usersData.filter((u) => u.role === "employee");
            setUsers(employeesOnly);
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
  }, [router]);

  const handleAdd = () => {
    setInputs((prev) => [
      ...prev,
      { id: Date.now(), field1: "", field2: "" },
    ]);
  };

  const handleRemove = (id: number) => {
    setInputs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleChange = (id: number, field: "field1" | "field2", value: string) => {
    setInputs((prev) =>
      prev.map((input) =>
        input.id === id ? { ...input, [field]: value } : input
      )
    );
  };

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

  try {
    const result = await createTask({
      ...data,
      requirements: JSON.stringify(filteredReqs),
      dueDate: new Date(data.dueDate),
      createdBy: user.uid,
    });

    if (result.success) {
      setError(null);
      reset();
      setInputs([{ id: 1, field1: "", field2: "" }]);
      setTimeout(() => {
        router.push(`/admin/tasks/${result.id}`);
      }, 2000);
    } else {
      setError(result.error || "Даалгавар үүсгэхэд алдаа гарлаа");
    }
  } catch (error: any) {
    setError(error.message || "Даалгавар үүсгэхэд алдаа гарлаа");
  } finally {
    setSubmitLoading(false);
  }
};


  const handleCancel = () => {
    router.push("/admin/tasks");
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
          <h1 className="text-3xl font-bold text-gray-900">Даалгавар нэмэх</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white rounded-md border border-blue-600 hover:bg-blue-50"
            >
              Хянах самбар
            </button>
            <div className="text-sm font-medium text-gray-600">
              {user?.displayName} (Админ)
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Гарчиг</label>
              <input
                {...register("title", { required: "Гарчиг оруулна уу" })}
                className="w-full border rounded p-2"
              />
              {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
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
                      className="text-red-600"
                      disabled={inputs.length === 1}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block mb-1 font-medium">Ажилтан</label>
              <select
                {...register("assignedTo", { required: "Ажилтан сонгоно уу" })}
                className="w-full border rounded p-2"
              >
                <option value="">--Сонгоно уу--</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.email})
                  </option>
                ))}
              </select>
              {errors.assignedTo && (
                <p className="text-red-500 text-sm">{errors.assignedTo.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block mb-1 font-medium">Дуусах хугацаа</label>
                <input
                  type="date"
                  {...register("dueDate", { required: "Дуусах хугацаа оруулна уу" })}
                  className="w-full border rounded p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
              >
                Болих
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className={`px-4 py-2 rounded text-white ${
                  submitLoading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitLoading ? "Хадгалж байна..." : "Даалгавар үүсгэх"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
