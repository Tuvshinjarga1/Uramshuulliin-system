"use client";

import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getTask, updateTask, deleteTask, updateTaskStatus } from "@/lib/tasks";
import { Task, User } from "@/types";
import { logoutUser } from "@/lib/auth";
import TaskCard from "@/components/TaskCard";

export default function EvaluationPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [requirements, setRequirements] = useState<any[]>([]);


  const loadData = async () => {
    try {
      // Даалгаврын мэдээлэл авах
      const taskResult = await getTask(taskId);
      if (taskResult.success && taskResult.task) {
        const taskData = taskResult.task as Task;
        setTask(taskData);
        

        // Хариуцсан хэрэглэгчийн мэдээлэл авах
        if (taskData.assignedTo) {
          const userDoc = await getDoc(doc(db, "users", taskData.assignedTo));
          if (userDoc.exists()) {
            setAssignedUser({
              uid: userDoc.id,
              ...userDoc.data(),
            } as User);
          }
        }
      } else {
        setError("Даалгаврын мэдээлэл авахад алдаа гарлаа");
      }

      setLoading(false);
    } catch (error: any) {
      setError(error.message || "Мэдээлэл авахад алдаа гарлаа");
      setLoading(false);
    }
  };
const handleSaveEvaluation = async () => {
  setSubmitLoading(true);
  try {
    const updatedTask = {
      ...task,
      requirements: JSON.stringify(requirements),
    };
    const result = await updateTask(taskId, updatedTask);
    if (result.success) {
      await loadData(); // Шинэчилсэн мэдээлэл авах
    } else {
      setError(result.error || "Хадгалахад алдаа гарлаа");
    }
  } catch (err: any) {
    setError(err.message || "Хадгалахад алдаа гарлаа");
  } finally {
    setSubmitLoading(false);
  }
};

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
            await loadData();
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
    });

    return () => unsubscribe();
  }, [router, taskId]);

  const handleDeleteTask = async () => {
    if (!window.confirm("Даалгаврыг устгахдаа итгэлтэй байна уу?")) {
      return;
    }

    setDeleteLoading(true);
    try {
      const result = await deleteTask(taskId);
      if (result.success) {
        router.push("/admin/tasks");
      } else {
        setError(result.error || "Даалгавар устгахад алдаа гарлаа");
      }
    } catch (error: any) {
      setError(error.message || "Даалгавар устгахад алдаа гарлаа");
    } finally {
      setDeleteLoading(false);
    }
  };
  

  const handleStatusUpdate = async () => {
    await loadData();
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Даалгавар олдсонгүй</div>
      </div>
    );
  }

  const formatDate = (date: Date | any) => {
    if (!date) return "Тодорхойгүй";
    if (typeof date === "string") {
      return new Date(date).toLocaleDateString("mn-MN");
    }
    return date.toDate
      ? date.toDate().toLocaleDateString("mn-MN")
      : new Date(date).toLocaleDateString("mn-MN");
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Үнэлгээний самбар
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/admin/tasks")}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white rounded-md border border-blue-600 hover:bg-blue-50"
            >
              Бүх даалгавар
            </button>
            <div className="text-sm font-medium text-gray-600">
              {currentUser?.displayName} (Админ)
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">{task.title}</h2>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full 
                  ${
                    task.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : task.status === "in-progress"
                      ? "bg-blue-100 text-blue-800"
                      : task.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {task.status === "completed"
                    ? "Дууссан"
                    : task.status === "in-progress"
                    ? "Хийгдэж буй"
                    : task.status === "rejected"
                    ? "Цуцлагдсан"
                    : "Хүлээгдэж буй"}
                </span>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Дуусах хугацаа</p>
                  <p className="font-medium">{formatDate(task.dueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Урамшуулал</p>
                  <p className="font-medium">
                    {task.incentiveAmount.toLocaleString()} ₮
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Үүсгэсэн огноо</p>
                  <p className="font-medium">{formatDate(task.createdAt)}</p>
                </div>
                {task.completedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Дууссан огноо</p>
                    <p className="font-medium">
                      {formatDate(task.completedAt)}
                    </p>
                  </div>
                )}
              </div>

              {task.requirements ? (
                (() => {
                  let requirementsArray = [];
                  try {
                    requirementsArray = JSON.parse(task.requirements);
                  } catch (error) {
                    requirementsArray = [];
                  }

                  return requirementsArray.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white shadow rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тавигдах шаардлага</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Үнэлгээ(%)</th>
                            
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Гүйцэтгэсэн байдал</th>
                            
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {requirementsArray.map((req: any, index: number) => (
                            <tr key={req.id || index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{req.field1}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{req.field2}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                <input
                                    type="text"
                                    className="border border-gray-300 rounded px-2 py-1 w-24"
                                    value={req.completed}
                                    placeholder=""
                                />
                                </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Шаардлага оруулаагүй байна.</p>
                  );
                })()
              ) : (
                <p className="text-sm text-gray-500">Шаардлага оруулаагүй байна.</p>
              )}

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
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium mb-4">Хариуцагч</h3>

              {assignedUser ? (
                <div>
                  <p className="font-medium text-gray-900">
                    {assignedUser.displayName}
                  </p>
                  <p className="text-gray-600">{assignedUser.email}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Үүрэг:{" "}
                    {assignedUser.role === "admin"
                      ? "Админ"
                      : assignedUser.role === "accountant"
                      ? "Нягтлан"
                      : "Ажилтан"}
                  </p>

                  <button
                    onClick={() =>
                      router.push(`/admin/users/${assignedUser.uid}`)
                    }
                    className="mt-4 px-3 py-1 text-sm font-medium text-blue-600 bg-white rounded-md border border-blue-600 hover:bg-blue-50"
                  >
                    Профайл харах
                  </button>
                </div>
              ) : (
                <p className="text-gray-600">Хариуцагч олдсонгүй</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
