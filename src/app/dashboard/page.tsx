"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getUserTasks, updateTaskStatus } from "@/lib/tasks";
import { getUserIncentives } from "@/lib/incentives";
import { Task, Incentive } from "@/types";
import { logoutUser } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadUserData = async (userId: string) => {
    // Хэрэглэгчийн даалгаврууд авах
    const tasksResult = await getUserTasks(userId);
    if (tasksResult.success) {
      setTasks(tasksResult.tasks as Task[]);
    }

    // Хэрэглэгчийн урамшууллын мэдээлэл авах
    const incentivesResult = await getUserIncentives(userId);
    if (incentivesResult.success) {
      setIncentives(incentivesResult.incentives as Incentive[]);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Хэрэглэгчийн профайл авах
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: currentUser.uid, ...userDoc.data() });
          await loadUserData(currentUser.uid);
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
  }, [router]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  // Ажил гүйцэтгэсэн тэмдэглэх
  const handleCompleteTask = async (taskId: string) => {
    if (window.confirm("Энэ даалгаврыг гүйцэтгэсэн гэж тэмдэглэх үү?")) {
      setUpdating(taskId);
      const result = await updateTaskStatus(taskId, "completed");
      if (result.success) {
        // Хэрэглэгчийн даалгаврын жагсаалтыг шинэчлэх
        await loadUserData(user.uid);
      } else {
        alert("Алдаа гарлаа: " + result.error);
      }
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Ачаалж байна...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Хянах самбар</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-gray-600">
              {user?.displayName}
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Гарах
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Даалгаврын хэсэг */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-black">
              Таны даалгаврууд
            </h2>
            {tasks.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-gray-600">
                  Одоогоор даалгавар байхгүй байна.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Гарчиг
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Төлөв
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Дуусах хугацаа
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Урамшуулал
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Үйлдэл
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {task.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {task.description.substring(0, 50)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(task.dueDate.toString()).toLocaleDateString(
                            "mn-MN"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.incentiveAmount.toLocaleString()} ₮
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {task.status === "pending" ||
                          task.status === "in-progress" ? (
                            <button
                              onClick={() => handleCompleteTask(task.id)}
                              disabled={updating === task.id}
                              className={`px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 ${
                                updating === task.id
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              {updating === task.id
                                ? "Ачаалж байна..."
                                : "Дууссан"}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {task.status === "completed"
                                ? "Гүйцэтгэсэн"
                                : "Үйлдэл хийх боломжгүй"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Урамшууллын хэсэг */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-black">
              Таны урамшуулал
            </h2>
            {incentives.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-gray-600">
                  Одоогоор урамшууллын мэдээлэл байхгүй байна.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Сар, жил
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Гүйцэтгэсэн даалгавар
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Нийт дүн
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Төлөв
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {incentives.map((incentive) => (
                      <tr key={incentive.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {`${incentive.year}-${incentive.month}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {incentive.taskCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {incentive.totalAmount.toLocaleString()} ₮
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${
                              incentive.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : incentive.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {incentive.status === "approved"
                              ? "Баталгаажсан"
                              : incentive.status === "rejected"
                              ? "Цуцлагдсан"
                              : "Хүлээгдэж буй"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
