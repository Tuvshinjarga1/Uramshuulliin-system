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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedIncentive, setSelectedIncentive] = useState<Incentive | null>(
    null
  );

  const loadUserData = async (userId: string) => {
    // Хэрэглэгчийн даалгаврууд авах
    const tasksResult = await getUserTasks(userId);
    console.log("Даалгаврын мэдээлэл:", tasksResult);
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
          const userData = userDoc.data();
          setUser({ uid: currentUser.uid, ...userData });

          // Хэрэглэгчийн мэдээллийг авсны дараа даалгавруудыг ачаалах
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

  const handleRefresh = async () => {
    if (user && user.uid) {
      setLoading(true);
      await loadUserData(user.uid);
      setLoading(false);
    }
  };

  // Ажил эхлүүлэх
  const handleStartTask = async (taskId: string) => {
    if (window.confirm("Энэ даалгаврыг эхлүүлэх үү?")) {
      setUpdating(taskId);
      const result = await updateTaskStatus(taskId, "in-progress");
      if (result.success) {
        // Хэрэглэгчийн даалгаврын жагсаалтыг шинэчлэх
        await loadUserData(user.uid);
      } else {
        alert("Алдаа гарлаа: " + result.error);
      }
      setUpdating(null);
    }
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

  // Даалгаврын дэлгэрэнгүй мэдээлэл харах
  const viewTaskDetails = (task: Task) => {
    setSelectedTask(task);
  };

  // Даалгаврын дэлгэрэнгүй хаах
  const closeTaskDetails = () => {
    setSelectedTask(null);
  };

  // Урамшууллын дэлгэрэнгүй мэдээлэл харах
  const viewIncentiveDetails = (incentive: Incentive) => {
    setSelectedIncentive(incentive);
  };

  // Урамшууллын дэлгэрэнгүй хаах
  const closeIncentiveDetails = () => {
    setSelectedIncentive(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Хянах самбар</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
            >
              Дахин ачаалах
            </button>
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
              <div className="overflow-x-auto text-black">
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
                      <tr
                        key={task.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => viewTaskDetails(task)}
                      >
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
                          {task.dueDate &&
                          typeof task.dueDate === "object" &&
                          "seconds" in task.dueDate
                            ? new Date(
                                task.dueDate.seconds * 1000
                              ).toLocaleDateString("mn-MN")
                            : typeof task.dueDate === "string"
                            ? new Date(task.dueDate).toLocaleDateString("mn-MN")
                            : "Тодорхойгүй"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.incentiveAmount.toLocaleString()} ₮
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {task.status === "pending" ? (
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleStartTask(task.id)}
                                disabled={updating === task.id}
                                className={`px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                                  updating === task.id
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                {updating === task.id
                                  ? "Ачаалж байна..."
                                  : "Эхлүүлэх"}
                              </button>
                            </div>
                          ) : task.status === "in-progress" ? (
                            <div className="flex justify-center space-x-2">
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
                            </div>
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
                      <tr
                        key={incentive.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => viewIncentiveDetails(incentive)}
                      >
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

      {/* Даалгаврын дэлгэрэнгүй мэдээллийн модал */}
      {selectedTask && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{selectedTask.title}</h3>
                <button
                  onClick={closeTaskDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="mb-4">
                <div className="mb-2">
                  <span className="font-medium">Төлөв: </span>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${
                      selectedTask.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : selectedTask.status === "in-progress"
                        ? "bg-blue-100 text-blue-800"
                        : selectedTask.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedTask.status === "completed"
                      ? "Дууссан"
                      : selectedTask.status === "in-progress"
                      ? "Хийгдэж буй"
                      : selectedTask.status === "rejected"
                      ? "Цуцлагдсан"
                      : "Хүлээгдэж буй"}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Дуусах хугацаа: </span>
                  <span>
                    {selectedTask.dueDate &&
                    typeof selectedTask.dueDate === "object" &&
                    "seconds" in selectedTask.dueDate
                      ? new Date(
                          selectedTask.dueDate.seconds * 1000
                        ).toLocaleDateString("mn-MN")
                      : typeof selectedTask.dueDate === "string"
                      ? new Date(selectedTask.dueDate).toLocaleDateString(
                          "mn-MN"
                        )
                      : "Тодорхойгүй"}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Урамшуулал: </span>
                  <span>{selectedTask.incentiveAmount.toLocaleString()} ₮</span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Даалгавар үүссэн огноо: </span>
                  <span>
                    {selectedTask.createdAt
                      ? typeof selectedTask.createdAt === "object" &&
                        "seconds" in selectedTask.createdAt
                        ? new Date(
                            selectedTask.createdAt.seconds * 1000
                          ).toLocaleDateString("mn-MN")
                        : new Date(selectedTask.createdAt).toLocaleDateString(
                            "mn-MN"
                          )
                      : "Тодорхойгүй"}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Дэлгэрэнгүй тайлбар:</h4>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                {selectedTask.status === "pending" && (
                  <button
                    onClick={() => {
                      handleStartTask(selectedTask.id);
                      closeTaskDetails();
                    }}
                    className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Эхлүүлэх
                  </button>
                )}

                {selectedTask.status === "in-progress" && (
                  <button
                    onClick={() => {
                      handleCompleteTask(selectedTask.id);
                      closeTaskDetails();
                    }}
                    className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Дууссан
                  </button>
                )}

                <button
                  onClick={closeTaskDetails}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Хаах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Урамшууллын дэлгэрэнгүй мэдээллийн модал */}
      {selectedIncentive && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">
                  Урамшуулал: {selectedIncentive.year}-{selectedIncentive.month}
                </h3>
                <button
                  onClick={closeIncentiveDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="mb-4">
                <div className="mb-2">
                  <span className="font-medium">Төлөв: </span>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${
                      selectedIncentive.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : selectedIncentive.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedIncentive.status === "approved"
                      ? "Баталгаажсан"
                      : selectedIncentive.status === "rejected"
                      ? "Цуцлагдсан"
                      : "Хүлээгдэж буй"}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">
                    Гүйцэтгэсэн даалгаврын тоо:{" "}
                  </span>
                  <span>{selectedIncentive.taskCount}</span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Нийт урамшууллын дүн: </span>
                  <span className="text-lg font-semibold text-blue-600">
                    {selectedIncentive.totalAmount.toLocaleString()} ₮
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Үүссэн огноо: </span>
                  <span>
                    {selectedIncentive.createdAt
                      ? typeof selectedIncentive.createdAt === "object" &&
                        "seconds" in selectedIncentive.createdAt
                        ? new Date(
                            selectedIncentive.createdAt.seconds * 1000
                          ).toLocaleDateString("mn-MN")
                        : new Date(
                            selectedIncentive.createdAt
                          ).toLocaleDateString("mn-MN")
                      : "Тодорхойгүй"}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Шинэчлэгдсэн огноо: </span>
                  <span>
                    {selectedIncentive.updatedAt
                      ? typeof selectedIncentive.updatedAt === "object" &&
                        "seconds" in selectedIncentive.updatedAt
                        ? new Date(
                            selectedIncentive.updatedAt.seconds * 1000
                          ).toLocaleDateString("mn-MN")
                        : new Date(
                            selectedIncentive.updatedAt
                          ).toLocaleDateString("mn-MN")
                      : "Тодорхойгүй"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={closeIncentiveDetails}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Хаах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
