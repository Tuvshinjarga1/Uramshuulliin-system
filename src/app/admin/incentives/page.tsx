"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { getAllUsers } from "@/lib/users";
import { calculateIncentive, getAllIncentives } from "@/lib/incentives";
import { Incentive, User } from "@/types";
import { logoutUser } from "@/lib/auth";
import IncentiveCard from "@/components/IncentiveCard";

export default function IncentivesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().getMonth() + 1 < 10
      ? `0${new Date().getMonth() + 1}`
      : `${new Date().getMonth() + 1}`
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );

  const loadData = async () => {
    try {
      // Бүх хэрэглэгчдийн жагсаалт авах
      const usersResult = await getAllUsers();
      if (usersResult.success) {
        const employees = (usersResult.users as User[]).filter(
          (u) => u.role === "employee"
        );
        setUsers(employees);

        if (employees.length > 0 && !selectedUserId) {
          setSelectedUserId(employees[0].uid);
        }
      }

      // Бүх урамшууллын мэдээлэл авах
      const incentivesResult = await getAllIncentives();
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Хэрэглэгчийн профайл авах
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Зөвхөн админ хэрэглэгч нэвтрэх эрхтэй
          if (userData.role === "admin") {
            setUser({ uid: currentUser.uid, ...userData });
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
  }, [router]);

  const handleCalculateIncentive = async () => {
    setCalculating(true);
    setError(null);
    setSuccess(null);

    try {
      // Тухайн хэрэглэгчид, тухайн сар, жилийн урамшуулал бодож шинээр үүсгэх
      const result = await calculateIncentive(
        selectedUserId,
        selectedMonth,
        selectedYear
      );

      if (result.success) {
        setSuccess("Урамшуулал амжилттай бодогдлоо");

        // Шинээр бодогдсон урамшууллыг хүснэгтэд нэмэх
        if (result.incentive) {
          setIncentives([...incentives, result.incentive]);
        }
      } else {
        setError(result.error || "Урамшуулал бодоход алдаа гарлаа");
      }
    } catch (error: any) {
      setError(error.message || "Урамшуулал бодоход алдаа гарлаа");
    } finally {
      setCalculating(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    await loadData();
  };

  const handleStatusChange = async () => {
    await loadData();
  };

  const getUserById = (userId: string): User | undefined => {
    return users.find((u) => u.uid === userId);
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
          <h1 className="text-3xl font-bold text-gray-900">Урамшуулал</h1>
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Урамшуулал тооцоолох хэсэг */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Урамшуулал тооцоолох</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Хэрэглэгч сонгох */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ажилтан
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {users.length === 0 ? (
                  <option value="">Ажилтан байхгүй байна</option>
                ) : (
                  users.map((user) => (
                    <option key={user.uid} value={user.uid}>
                      {user.displayName}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Сар сонгох */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Сар
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="01">1-р сар</option>
                <option value="02">2-р сар</option>
                <option value="03">3-р сар</option>
                <option value="04">4-р сар</option>
                <option value="05">5-р сар</option>
                <option value="06">6-р сар</option>
                <option value="07">7-р сар</option>
                <option value="08">8-р сар</option>
                <option value="09">9-р сар</option>
                <option value="10">10-р сар</option>
                <option value="11">11-р сар</option>
                <option value="12">12-р сар</option>
              </select>
            </div>

            {/* Жил сонгох */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Жил
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
            </div>

            {/* Товч */}
            <div className="flex items-end">
              <button
                onClick={handleCalculateIncentive}
                disabled={calculating || !selectedUserId}
                className={`w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                  calculating || !selectedUserId
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {calculating ? "Бодож байна..." : "Бодох"}
              </button>
            </div>
          </div>
        </div>

        {/* Урамшууллуудын жагсаалт */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Урамшууллын жагсаалт</h2>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Дахин ачаалах
          </button>
        </div>

        {incentives.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-600">
              Одоогоор урамшууллын мэдээлэл байхгүй байна.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incentives.map((incentive) => {
              const incentiveUser = getUserById(incentive.userId);
              return (
                <IncentiveCard
                  key={incentive.id}
                  incentive={incentive}
                  user={incentiveUser}
                  allowActions={true}
                  onStatusChange={handleStatusChange}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
