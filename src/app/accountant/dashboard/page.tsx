"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { getAllIncentives, updateIncentiveStatus } from "@/lib/incentives";
import { Incentive, User } from "@/types";
import { logoutUser } from "@/lib/auth";

export default function AccountantDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(
    null
  );

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

            // Бүх хэрэглэгчдийн жагсаалт авах
            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersData = usersSnapshot.docs.map((doc) => ({
              uid: doc.id,
              ...doc.data(),
            })) as User[];
            setUsers(usersData);

            // Бүх урамшууллын мэдээлэл авах
            const incentivesResult = await getAllIncentives();
            if (incentivesResult.success) {
              setIncentives(incentivesResult.incentives as Incentive[]);
            }
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
  }, [router]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const handleApproveIncentive = async (incentiveId: string) => {
    setStatusUpdateLoading(incentiveId);
    const result = await updateIncentiveStatus(incentiveId, "approved");
    if (result.success) {
      setIncentives(
        incentives.map((inc) =>
          inc.id === incentiveId ? { ...inc, status: "approved" } : inc
        )
      );
    }
    setStatusUpdateLoading(null);
  };

  const handleRejectIncentive = async (incentiveId: string) => {
    setStatusUpdateLoading(incentiveId);
    const result = await updateIncentiveStatus(incentiveId, "rejected");
    if (result.success) {
      setIncentives(
        incentives.map((inc) =>
          inc.id === incentiveId ? { ...inc, status: "rejected" } : inc
        )
      );
    }
    setStatusUpdateLoading(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Ачаалж байна...</div>
      </div>
    );
  }

  // Урамшууллын нийт дүн
  const totalApprovedAmount = incentives
    .filter((inc) => inc.status === "approved")
    .reduce((sum, inc) => sum + inc.totalAmount, 0);

  // Хүлээгдэж байгаа урамшууллууд
  const pendingIncentives = incentives.filter(
    (inc) => inc.status === "pending"
  );

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Нягтлан Хянах Самбар
          </h1>
          <div className="flex items-center space-x-4">
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
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Нийт урамшуулал
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {totalApprovedAmount.toLocaleString()} ₮
                  </dd>
                </dl>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Хүлээгдэж буй
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {pendingIncentives.length}
                  </dd>
                </dl>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Нийт хэрэглэгч
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {users.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Урамшууллын хэсэг */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Урамшуулал</h2>
              <button
                onClick={() => router.push("/accountant/reports")}
                className="bg-blue-600 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700"
              >
                Тайлан гаргах
              </button>
            </div>

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
                        Хэрэглэгч
                      </th>
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
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Үйлдэл
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {incentives.map((incentive) => (
                      <tr key={incentive.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {users.find((u) => u.uid === incentive.userId)
                            ?.displayName || "Олдсонгүй"}
                        </td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() =>
                              router.push(
                                `/accountant/incentives/${incentive.id}`
                              )
                            }
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Харах
                          </button>

                          {incentive.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleApproveIncentive(incentive.id)
                                }
                                disabled={statusUpdateLoading === incentive.id}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                {statusUpdateLoading === incentive.id
                                  ? "Ачаалж байна..."
                                  : "Зөвшөөрөх"}
                              </button>
                              <button
                                onClick={() =>
                                  handleRejectIncentive(incentive.id)
                                }
                                disabled={statusUpdateLoading === incentive.id}
                                className="text-red-600 hover:text-red-900"
                              >
                                {statusUpdateLoading === incentive.id
                                  ? "Ачаалж байна..."
                                  : "Цуцлах"}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Хэрэглэгчдийн хэсэг */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-black">Хэрэглэгчид</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white shadow rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Нэр
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      И-мэйл
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Үүрэг
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Нийт урамшуулал
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => {
                    // Хэрэглэгчийн баталгаажсан нийт урамшуулал
                    const userTotalIncentive = incentives
                      .filter(
                        (inc) =>
                          inc.userId === user.uid && inc.status === "approved"
                      )
                      .reduce((sum, inc) => sum + inc.totalAmount, 0);

                    return (
                      <tr key={user.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.role === "admin"
                            ? "Админ"
                            : user.role === "accountant"
                            ? "Нягтлан"
                            : "Ажилтан"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {userTotalIncentive.toLocaleString()} ₮
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
