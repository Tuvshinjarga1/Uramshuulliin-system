"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { getAllTasks } from "@/lib/tasks";
import { getAllIncentives } from "@/lib/incentives";
import { Task, Incentive, User } from "@/types";
import { logoutUser } from "@/lib/auth";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [userSearch, setUserSearch] = useState("");
const [taskSearch, setTaskSearch] = useState("");
const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

const itemsPerPage = 5;
const [currentPage, setCurrentPage] = useState(1);
const taskItemsPerPage = 5;
const [taskCurrentPage, setTaskCurrentPage] = useState(1);


const paginatedUsers = filteredUsers.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);
const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const filteredTasks = tasks.filter((t) => {
    const assignedUser = users.find((u) => u.uid === t.assignedTo);
    return (
      t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
      (assignedUser?.displayName.toLowerCase().includes(taskSearch.toLowerCase()) ?? false)
    );
  });

  const paginatedTasks = filteredTasks.slice(
  (taskCurrentPage - 1) * taskItemsPerPage,
  taskCurrentPage * taskItemsPerPage
);

const taskTotalPages = Math.ceil(filteredTasks.length / taskItemsPerPage);


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

            // Бүх хэрэглэгчдийн жагсаалт авах
            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersData = usersSnapshot.docs.map((doc) => ({
              uid: doc.id,
              ...doc.data(),
            })) as User[];
            setUsers(usersData);

            // Бүх даалгаврууд авах
            const tasksResult = await getAllTasks();
            if (tasksResult.success) {
              setTasks(tasksResult.tasks as Task[]);
            }

            // Бүх урамшууллын мэдээлэл авах
            const incentivesResult = await getAllIncentives();
            if (incentivesResult.success) {
              setIncentives(incentivesResult.incentives as Incentive[]);
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
  }, [router]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
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
            Админ Хянах Самбар
          </h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-gray-600">
              {user?.displayName} (Админ)
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
                    Нийт хэрэглэгч
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {users.length}
                  </dd>
                </dl>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Нийт даалгавар
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {tasks.length}
                  </dd>
                </dl>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Нийт урамшуулал
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {incentives
                      .filter((inc) => inc.status === "approved")
                      .reduce((sum, inc) => sum + inc.totalAmount, 0)
                      .toLocaleString()}{" "}
                    ₮
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Хэрэглэгчдийн жагсаалт */}
          <div className="mb-8">
<div className="flex justify-between items-center mb-4">
  <h2 className="text-2xl font-bold">Хэрэглэгчид</h2>
  <div className="flex space-x-2">
    <input
      type="text"
      placeholder="Хайх (нэр, и-мэйл)..."
      value={userSearch}
      onChange={(e) => setUserSearch(e.target.value)}
      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
    />
    <button
      onClick={() => router.push("/admin/users/new")}
      className="bg-blue-600 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700"
    >
      Хэрэглэгч нэмэх
    </button>
  </div>
</div>



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
                      Үйлдэл
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
  {paginatedUsers.map((user) => (
    <tr key={user.uid} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.role === "admin" ? "Админ" : user.role === "accountant" ? "Нягтлан" : "Ажилтан"}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={() => router.push(`/admin/users/${user.uid}`)}
          className="text-blue-600 hover:text-blue-900 mr-3"
        >
          Харах
        </button>
        <button
          onClick={() => router.push(`/admin/users/${user.uid}/edit`)}
          className="text-indigo-600 hover:text-indigo-900"
        >
          Засах
        </button>
      </td>
    </tr>
  ))}
</tbody>

              </table>
            </div>
          </div>
          <div className="flex justify-center items-center mt-4 space-x-2">
  <button
    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
    disabled={currentPage === 1}
    className="px-3 py-1 border rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
  >
    Өмнөх
  </button>
  <span className="text-sm">
    Хуудас {currentPage} - {totalPages}
  </span>
  <button
    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
    disabled={currentPage === totalPages}
    className="px-3 py-1 border rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
  >
    Дараах
  </button>
</div>

          {/* Даалгаврын хэсэг */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
  <h2 className="text-2xl font-bold">Даалгаврууд</h2>
  <div className="flex space-x-2">
    <input
      type="text"
      placeholder="Хайх (гарчиг, хэрэглэгч)..."
      value={taskSearch}
      onChange={(e) => setTaskSearch(e.target.value)}
      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
    />
    <button
      onClick={() => router.push("/admin/tasks/new")}
      className="bg-blue-600 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700"
    >
      Даалгавар нэмэх
    </button>
  </div>
</div>


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
                        Хэрэглэгч
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
                        Үйлдэл
                      </th>
                    </tr>
                  </thead>
  <tbody className="divide-y divide-gray-200">
  {paginatedTasks.slice(0, 5).map((task) => (
    <tr key={task.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{task.title}</div>
        <div className="text-sm text-gray-500">{task.description.substring(0, 30)}...</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {users.find((u) => u.uid === task.assignedTo)?.displayName || "Олдсонгүй"}
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
        {task.incentiveAmount.toLocaleString()} ₮
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={() => router.push(`/admin/tasks/${task.id}`)}
          className="text-blue-600 hover:text-blue-900 mr-3"
        >
          Харах
        </button>
        <button
          onClick={() => router.push(`/admin/tasks/${task.id}/edit`)}
          className="text-indigo-600 hover:text-indigo-900"
        >
          Засах
        </button>
      </td>
    </tr>
  ))}
</tbody>

                </table>

                {tasks.length > 5 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => router.push("/admin/tasks")}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Бүгдийг харах
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Урамшууллын хэсэг */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Урамшуулал</h2>
              <button
                onClick={() => router.push("/admin/incentives")}
                className="bg-blue-600 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700"
              >
                Урамшуулал тооцоолох
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
                    {incentives.slice(0, 5).map((incentive) => (
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
                              router.push(`/admin/incentives/${incentive.id}`)
                            }
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Харах
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {incentives.length > 5 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => router.push("/admin/incentives")}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Бүгдийг харах
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
