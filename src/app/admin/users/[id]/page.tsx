"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getUserProfile, deleteUserProfile } from "@/lib/auth";
import { getUserTasks } from "@/lib/tasks";
import { getUserIncentives } from "@/lib/incentives";
import { Task, Incentive, User } from "@/types";
import { logoutUser } from "@/lib/auth";

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      // Хэрэглэгчийн мэдээлэл авах
      const profileResult = await getUserProfile(userId);
      if (profileResult.success) {
        setUserProfile({ uid: userId, ...profileResult.profile });
      } else {
        setError("Хэрэглэгчийн мэдээлэл авахад алдаа гарлаа");
        return;
      }

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

      setLoading(false);
    } catch (error: any) {
      setError(error.message || "Мэдээлэл авахад алдаа гарлаа");
      setLoading(false);
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
  }, [router, userId]);

  const handleDeleteUser = async () => {
    if (!window.confirm("Хэрэглэгчийг устгахдаа итгэлтэй байна уу?")) {
      return;
    }

    setDeleteLoading(true);
    try {
      const result = await deleteUserProfile(userId);
      if (result.success) {
        router.push("/admin/dashboard");
      } else {
        setError(result.error || "Хэрэглэгч устгахад алдаа гарлаа");
      }
    } catch (error: any) {
      setError(error.message || "Хэрэглэгч устгахад алдаа гарлаа");
    } finally {
      setDeleteLoading(false);
    }
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

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Хэрэглэгч олдсонгүй</div>
      </div>
    );
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "Админ";
      case "accountant":
        return "Нягтлан";
      default:
        return "Ажилтан";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Хэрэглэгчийн мэдээлэл
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white rounded-md border border-blue-600 hover:bg-blue-50"
            >
              Хянах самбар
            </button>
            <div className="text-sm font-medium text-gray-600">
              {currentUser?.displayName} (Админ)
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">
                  {userProfile.displayName}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {getRoleText(userProfile.role)}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500">И-мэйл</p>
                <p className="text-gray-900">{userProfile.email}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500">Төрсөн огноо</p>
                <p className="text-gray-900">
                  {new Date(userProfile.birthdate).toLocaleDateString("mn-MN")}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500">Хүйс</p>
                <p className="text-gray-900">
                  {userProfile.gender === "male" 
                    ? "Эрэгтэй" 
                    : userProfile.gender === "female" 
                    ? "Эмэгтэй" 
                    : "Бусад"}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500">Утасны дугаар</p>
                <p className="text-gray-900">{userProfile.phone || "-"}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500">Гэрийн хаяг</p>
                <p className="text-gray-900">{userProfile.address || "-"}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500">Цалин</p>
                <p className="text-gray-900">{userProfile.salary?.toLocaleString() || "-"} ₮</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500">Бүртгүүлсэн огноо</p>
                <p className="text-gray-900">
                  {new Date(userProfile.createdAt).toLocaleDateString("mn-MN")}
                </p>
              </div>

              <div className="flex flex-col space-y-2 mt-6">
                <button
                  onClick={() => router.push(`/admin/users/${userId}/edit`)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700"
                >
                  Засах
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleteLoading}
                  className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 ${
                    deleteLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {deleteLoading ? "Устгаж байна..." : "Устгах"}
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            {/* Даалгаврын хэсэг */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Даалгаврууд</h2>

              {tasks.length === 0 ? (
                <p className="text-gray-600">
                  Одоогоор даалгавар байхгүй байна.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
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
                          Урамшуулал
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Хугацаа
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tasks.map((task) => (
                        <tr
                          key={task.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => router.push(`/admin/tasks/${task.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {task.title}
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
                            {(task.incentiveAmount || 0).toLocaleString()} ₮
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(
                              task.dueDate.toString()
                            ).toLocaleDateString("mn-MN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Урамшууллын хэсэг */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Урамшуулал</h2>

              {incentives.length === 0 ? (
                <p className="text-gray-600">
                  Одоогоор урамшууллын мэдээлэл байхгүй байна.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
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
                          Даалгаврын тоо
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
                    <tbody className="bg-white divide-y divide-gray-200">
                      {incentives.map((incentive) => (
                        <tr key={incentive.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{`${incentive.year}-${incentive.month}`}</div>
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
        </div>
      </main>
    </div>
  );
}
