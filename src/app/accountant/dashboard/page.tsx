"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { getAllTasks } from "@/lib/tasks";
import { User, Task } from "@/types";
import { logoutUser } from "@/lib/auth";

interface Incentive {
  userId: string;
  userName: string;
  taskId: string;
  taskTitle: string;
  rating: number;
  amount: number;
  month: number;
  year: number;
}

interface GroupedIncentive {
  userId: string;
  userName: string;
  month: number;
  year: number;
  totalAmount: number;
  taskCount: number;
  totalRating: number;
}

interface GroupedIncentives {
  [key: string]: GroupedIncentive;
}

export default function AccountantDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [taskSearch, setTaskSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const itemsPerPage = 5;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === "accountant") {
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

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const handleCalculateIncentives = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Calculate incentives based on evaluated tasks for current month
    const incentives: Incentive[] = tasks
      .filter(task => task.evaluated)
      .filter(task => {
        if (!task.evaluatedAt) return false;
        
        const evaluatedDate = task.evaluatedAt instanceof Timestamp 
          ? task.evaluatedAt.toDate() 
          : task.evaluatedAt;
          
        return evaluatedDate.getMonth() + 1 === currentMonth && 
               evaluatedDate.getFullYear() === currentYear;
      })
      .map(task => {
        const assignedUser = users.find(u => u.uid === task.assignedTo);
        return {
          userId: task.assignedTo,
          userName: assignedUser?.displayName || "Олдсонгүй",
          taskId: task.id,
          taskTitle: task.title,
          rating: task.rating || 0,
          amount: 0, // Will be calculated based on average
          month: currentMonth,
          year: currentYear
        };
      });

    // Group incentives by user and calculate average rating
    const groupedIncentives = incentives.reduce<GroupedIncentives>((acc, incentive) => {
      const key = `${incentive.userId}-${incentive.year}-${incentive.month}`;
      if (!acc[key]) {
        acc[key] = {
          userId: incentive.userId,
          userName: incentive.userName,
          month: incentive.month,
          year: incentive.year,
          totalAmount: 0,
          taskCount: 0,
          totalRating: 0
        };
      }
      acc[key].totalRating += incentive.rating;
      acc[key].taskCount += 1;
      return acc;
    }, {});

    // Calculate final amounts based on average ratings
    Object.values(groupedIncentives).forEach(group => {
      const averageRating = group.totalRating / group.taskCount;
      let amount = 0;

      // Calculate incentive amount based on average rating
      if (averageRating >= 4) {
        amount = 500000; // 500,000₮ for excellent work
      } else if (averageRating >= 3) {
        amount = 300000; // 300,000₮ for good work
      } else if (averageRating >= 2) {
        amount = 100000; // 100,000₮ for satisfactory work
      }

      group.totalAmount = amount;
    });

    // Navigate to incentives page with calculated data
    router.push(`/accountant/incentives/calculate?data=${encodeURIComponent(JSON.stringify(Object.values(groupedIncentives)))}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Ачаалж байна...</div>
      </div>
    );
  }

  // Үнэлгээ өгсөн даалгаврын тоо
  const evaluatedTasks = tasks.filter(task => task.evaluated);
  
  // Хайлтын үр дүн
  const filteredTasks = evaluatedTasks.filter(task => {
    const assignedUser = users.find(u => u.uid === task.assignedTo);
    return (
      task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
      task.description.toLowerCase().includes(taskSearch.toLowerCase()) ||
      (assignedUser?.displayName.toLowerCase().includes(taskSearch.toLowerCase()) ?? false)
    );
  });

  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const userTotalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const paginatedUsers = filteredUsers.slice(
    (userCurrentPage - 1) * itemsPerPage,
    userCurrentPage * itemsPerPage
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Үнэлгээ өгсөн даалгавар
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {evaluatedTasks.length}
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

          {/* Үнэлгээ өгсөн даалгавруудын хэсэг */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Үнэлгээ өгсөн даалгаврууд</h2>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Хайх (гарчиг, тайлбар, хэрэглэгч)..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                />
              
                <button
                  onClick={() => router.push("/accountant/incentives")}
                  className="bg-blue-600 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700"
                >
                 Урамшуулал тооцох
                </button>
                <button
                  onClick={() => router.push("/accountant/reports")}
                  className="bg-blue-600 px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-blue-700"
                >
             Тайлан гаргах
                </button>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-gray-600">
                  {taskSearch ? "Хайлтад тохирох үр дүн олдсонгүй." : "Одоогоор үнэлгээ өгсөн даалгавар байхгүй байна."}
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
                        Үнэлгээ өгсөн огноо
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
                    {paginatedTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          <div className="text-sm text-gray-500">{task.description.substring(0, 30)}...</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {users.find((u) => u.uid === task.assignedTo)?.displayName || "Олдсонгүй"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.evaluatedAt ? (task.evaluatedAt instanceof Date ? task.evaluatedAt.toLocaleDateString() : task.evaluatedAt.toDate().toLocaleDateString()) : "Тодорхойгүй"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/accountant/tasks/${task.id}/evaluation`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Харах
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 flex justify-center items-center space-x-2">
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
              </div>
            )}
          </div>

          {/* Хэрэглэгчдийн хэсэг */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Хэрэглэгчид</h2>
              <input
                type="text"
                placeholder="Хайх (нэр, и-мэйл)..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              />
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
                      Үнэлгээ өгсөн даалгавар
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedUsers.map((user) => {
                    // Хэрэглэгчийн үнэлгээ өгсөн даалгаврын тоо
                    const userEvaluatedTasks = evaluatedTasks.filter(
                      (task) => task.assignedTo === user.uid
                    ).length;

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
                          {userEvaluatedTasks}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 flex justify-center items-center space-x-2">
                <button
                  onClick={() => setUserCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={userCurrentPage === 1}
                  className="px-3 py-1 border rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                >
                  Өмнөх
                </button>
                <span className="text-sm">
                  Хуудас {userCurrentPage} - {userTotalPages}
                </span>
                <button
                  onClick={() => setUserCurrentPage((prev) => Math.min(prev + 1, userTotalPages))}
                  disabled={userCurrentPage === userTotalPages}
                  className="px-3 py-1 border rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                >
                  Дараах
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
