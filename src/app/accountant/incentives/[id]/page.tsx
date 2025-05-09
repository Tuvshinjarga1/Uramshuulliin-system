"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { Incentive, User, Task } from "@/types";
import { logoutUser } from "@/lib/auth";
import { updateIncentiveStatus } from "@/lib/incentives";

// ID параметрийг авах props
interface IncentiveDetailPageProps {
  params: {
    id: string;
  };
}

export default function IncentiveDetailPage({
  params,
}: IncentiveDetailPageProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [incentive, setIncentive] = useState<Incentive | null>(null);
  const [incentiveUser, setIncentiveUser] = useState<User | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const incentiveId = params.id;
  const [statusUpdateLoading, setStatusUpdateLoading] =
    useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Хэрэглэгчийн профайл авах
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Зөвхөн нягтлан хэрэглэгч нэвтрэх эрхтэй
          if (userData.role === "accountant") {
            setUser({ uid: currentUser.uid, ...userData });

            // Incentive мэдээлэл авах
            await loadIncentiveData();
          } else {
            // Нягтлан биш хэрэглэгч
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
  }, [router, incentiveId]);

  const loadIncentiveData = async () => {
    try {
      // Incentive мэдээлэл авах
      const incentiveDoc = await getDoc(doc(db, "incentives", incentiveId));

      if (!incentiveDoc.exists()) {
        alert("Урамшууллын мэдээлэл олдсонгүй");
        router.push("/accountant/dashboard");
        return;
      }

      const incentiveData = {
        id: incentiveDoc.id,
        ...incentiveDoc.data(),
      } as Incentive;
      setIncentive(incentiveData);

      // Incentive-д холбогдох хэрэглэгчийн мэдээлэл авах
      if (incentiveData.userId) {
        const userDoc = await getDoc(doc(db, "users", incentiveData.userId));
        if (userDoc.exists()) {
          setIncentiveUser({ uid: userDoc.id, ...userDoc.data() } as User);
        }
      }

      // Хэрэглэгчийн тухайн сарын дууссан даалгаврууд авах
      const tasksRef = collection(db, "tasks");
      const tasksSnapshot = await getDocs(tasksRef);

      const tasks: Task[] = [];
      tasksSnapshot.forEach((doc) => {
        const taskData = doc.data();

        // Хэрэглэгчийн даалгавар мөн эсэх шалгах
        if (
          taskData.assignedTo === incentiveData.userId &&
          taskData.status === "completed" &&
          taskData.completedAt
        ) {
          // Огноо хөрвүүлэх
          const completedDate =
            taskData.completedAt.toDate?.() || new Date(taskData.completedAt);
          const taskMonth = (completedDate.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          const taskYear = completedDate.getFullYear().toString();

          // Тухайн сарын даалгавар мөн эсэх шалгах
          if (
            taskMonth === incentiveData.month &&
            taskYear === incentiveData.year
          ) {
            tasks.push({
              id: doc.id,
              ...taskData,
            } as Task);
          }
        }
      });

      setCompletedTasks(tasks);
    } catch (error) {
      console.error("Урамшууллын мэдээлэл авахад алдаа гарлаа:", error);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  // Урамшуулал батлах
  const handleApproveIncentive = async () => {
    if (!incentive) return;

    if (window.confirm("Энэ урамшууллыг батлахдаа итгэлтэй байна уу?")) {
      setStatusUpdateLoading(true);
      setStatusMessage(null);

      try {
        const result = await updateIncentiveStatus(incentive.id, "approved");

        if (result.success) {
          setIncentive({
            ...incentive,
            status: "approved",
            updatedAt: Timestamp.now(),
          });
          setStatusMessage({
            type: "success",
            text: "Урамшуулал амжилттай батлагдлаа",
          });
        } else {
          setStatusMessage({
            type: "error",
            text: result.error || "Урамшуулал батлахад алдаа гарлаа",
          });
        }
      } catch (error: any) {
        setStatusMessage({
          type: "error",
          text: error.message || "Урамшуулал батлахад алдаа гарлаа",
        });
      } finally {
        setStatusUpdateLoading(false);
      }
    }
  };

  // Урамшуулал цуцлах
  const handleRejectIncentive = async () => {
    if (!incentive) return;

    if (window.confirm("Энэ урамшууллыг цуцлахдаа итгэлтэй байна уу?")) {
      setStatusUpdateLoading(true);
      setStatusMessage(null);

      try {
        const result = await updateIncentiveStatus(incentive.id, "rejected");

        if (result.success) {
          setIncentive({
            ...incentive,
            status: "rejected",
            updatedAt: Timestamp.now(),
          });
          setStatusMessage({
            type: "success",
            text: "Урамшуулал амжилттай цуцлагдлаа",
          });
        } else {
          setStatusMessage({
            type: "error",
            text: result.error || "Урамшуулал цуцлахад алдаа гарлаа",
          });
        }
      } catch (error: any) {
        setStatusMessage({
          type: "error",
          text: error.message || "Урамшуулал цуцлахад алдаа гарлаа",
        });
      } finally {
        setStatusUpdateLoading(false);
      }
    }
  };

  // Буцах
  const handleGoBack = () => {
    router.push("/accountant/dashboard");
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
          <h1 className="text-3xl font-bold text-gray-900">
            Урамшууллын мэдээлэл
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/accountant/dashboard")}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white rounded-md border border-blue-600 hover:bg-blue-50"
            >
              Хянах самбар
            </button>
            <div className="text-sm font-medium text-gray-600">
              {user?.displayName} (Нягтлан)
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
        {statusMessage && (
          <div
            className={`mb-4 p-4 rounded-md ${
              statusMessage.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {incentive ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={handleGoBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Буцах
                </button>

                {incentive.status === "pending" && (
                  <>
                    <button
                      onClick={handleRejectIncentive}
                      disabled={statusUpdateLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      {statusUpdateLoading ? "Ачаалж байна..." : "Цуцлах"}
                    </button>

                    <button
                      onClick={handleApproveIncentive}
                      disabled={statusUpdateLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {statusUpdateLoading ? "Ачаалж байна..." : "Батлах"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {incentiveUser?.displayName || "Хэрэглэгч"}
                  </h2>
                  <p className="text-gray-600">{incentiveUser?.email}</p>
                </div>
                <div className="mt-4 sm:mt-0 flex flex-col items-end">
                  <div className="text-lg font-medium">
                    {incentive.year} оны {incentive.month}-р сар
                  </div>
                  <span
                    className={`mt-2 px-3 py-1 text-xs font-medium rounded-full 
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
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Урамшууллын мэдээлэл
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Даалгаврын тоо:</span>
                      <span className="font-medium">{incentive.taskCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Нийт дүн:</span>
                      <span className="font-medium text-blue-600">
                        {incentive.totalAmount.toLocaleString()} ₮
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Үүссэн огноо:</span>
                      <span className="font-medium">
                        {incentive.createdAt &&
                        typeof incentive.createdAt === "object" &&
                        "seconds" in incentive.createdAt
                          ? new Date(
                              incentive.createdAt.seconds * 1000
                            ).toLocaleDateString("mn-MN")
                          : "Тодорхойгүй"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Шинэчлэгдсэн огноо:</span>
                      <span className="font-medium">
                        {incentive.updatedAt &&
                        typeof incentive.updatedAt === "object" &&
                        "seconds" in incentive.updatedAt
                          ? new Date(
                              incentive.updatedAt.seconds * 1000
                            ).toLocaleDateString("mn-MN")
                          : "Тодорхойгүй"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Хэрэглэгчийн мэдээлэл
                  </h3>
                  {incentiveUser ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Нэр:</span>
                        <span className="font-medium">
                          {incentiveUser.displayName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">И-мэйл:</span>
                        <span className="font-medium">
                          {incentiveUser.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      Хэрэглэгчийн мэдээлэл олдсонгүй
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Гүйцэтгэсэн даалгаврууд
              </h3>
              {completedTasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          №
                        </th>
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
                          Дууссан огноо
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Урамшуулал
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {completedTasks.map((task, index) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {task.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {task.description.substring(0, 50)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {task.completedAt &&
                            typeof task.completedAt === "object" &&
                            "seconds" in task.completedAt
                              ? new Date(
                                  task.completedAt.seconds * 1000
                                ).toLocaleDateString("mn-MN")
                              : typeof task.completedAt === "string"
                              ? new Date(task.completedAt).toLocaleDateString(
                                  "mn-MN"
                                )
                              : "Тодорхойгүй"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {task.incentiveAmount.toLocaleString()} ₮
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td
                          colSpan={3}
                          className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                        >
                          Нийт урамшууллын дүн
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {incentive.totalAmount.toLocaleString()} ₮
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded text-center">
                  <p className="text-gray-600">
                    Гүйцэтгэсэн даалгавар олдсонгүй.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-600">Урамшууллын мэдээлэл олдсонгүй.</p>
          </div>
        )}
      </main>
    </div>
  );
}
