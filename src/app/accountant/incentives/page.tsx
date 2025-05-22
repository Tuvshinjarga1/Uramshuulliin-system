"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { getAllTasks } from "@/lib/tasks";
import { User, Task } from "@/types";
import { logoutUser } from "@/lib/auth";

interface GroupedIncentive {
  userId: string;
  userName: string;
  month: number;
  year: number;
  baseSalary: number;
  incentiveAmount: number;
  taskCount: number;
  totalPercentage: number;
  averagePercentage: number;
  averageAmount: number;
  totalSalary: number;
}

export default function IncentivesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incentives, setIncentives] = useState<GroupedIncentive[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === "accountant") {
            setUser({ uid: currentUser.uid, ...userData });

            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersData = usersSnapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() })) as User[];
            setUsers(usersData);

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

  useEffect(() => {
    calculateIncentives();
  }, [selectedMonth, selectedYear, tasks, users]);

  const calculateIncentives = () => {
    const filteredTasks = tasks.filter(task => {
      if (!task.evaluated || !task.evaluatedAt) return false;
      const evaluatedDate = task.evaluatedAt instanceof Timestamp ? task.evaluatedAt.toDate() : task.evaluatedAt;
      return evaluatedDate.getMonth() + 1 === selectedMonth && evaluatedDate.getFullYear() === selectedYear;
    });

    const userTasks = filteredTasks.reduce((acc, task) => {
      if (!acc[task.assignedTo]) acc[task.assignedTo] = [];
      acc[task.assignedTo].push(task);
      return acc;
    }, {} as { [key: string]: Task[] });

    const calculated = Object.entries(userTasks).map(([userId, tasks]) => {
      const userInfo = users.find(u => u.uid === userId);
      const userName = userInfo?.displayName || "Олдсонгүй";
      // Ensure salary is numeric
      const baseSalary = Number(userInfo?.salary) || 0;
      const count = tasks.length;

      const totalPercentage = tasks.reduce((sum, t) => sum + (t.totalPercentage || 0), 0);
      const averagePercentage = count > 0 ? totalPercentage / count : 0;

      // Calculate incentive amount
      let incentiveAmount = 0;
      if (averagePercentage >= 70 && averagePercentage <= 80) {
        incentiveAmount = baseSalary * 0.1;
      } else if (averagePercentage > 80) {
        incentiveAmount = baseSalary * 0.2;
      }

      // Compute numeric total salary
      const totalSalary = baseSalary + incentiveAmount;

      return {
        userId,
        userName,
        month: selectedMonth,
        year: selectedYear,
        baseSalary,
        incentiveAmount,
        taskCount: count,
        totalPercentage,
        averagePercentage,
        averageAmount: count > 0 ? incentiveAmount / count : 0,
        totalSalary
      } as GroupedIncentive;
    });

    setIncentives(calculated);
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Ачаалж байна...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Урамшуулал</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-gray-600">
              {user?.displayName} (Нягтлан)
            </div>
            <button onClick={handleLogout} className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
              Гарах
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex items-center space-x-4">
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700">Сар</label>
              <select id="month" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{month}-р сар</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">Он</label>
              <select id="year" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Хэрэглэгч</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Үндсэн цалин</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Даалгаврын тоо</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дундаж хувь</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Урамшуулал</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Нийт цалин</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incentives.map(incentive => (
                  <tr key={incentive.userId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{incentive.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{incentive.baseSalary.toLocaleString()}₮</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{incentive.taskCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{incentive.averagePercentage.toFixed(1)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{incentive.incentiveAmount.toLocaleString()}₮</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{incentive.totalSalary.toLocaleString()}₮</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
