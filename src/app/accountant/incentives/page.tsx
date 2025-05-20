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
  averageRating: number;
  averageAmount: number;
  salary: number;
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

            // Get all users
            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersData = usersSnapshot.docs.map((doc) => ({
              uid: doc.id,
              ...doc.data(),
            })) as User[];
            setUsers(usersData);

            // Get all tasks
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
    // Filter tasks for selected month and year
    const filteredTasks = tasks.filter(task => {
      if (!task.evaluated || !task.evaluatedAt) return false;
      
      const evaluatedDate = task.evaluatedAt instanceof Timestamp 
        ? task.evaluatedAt.toDate() 
        : task.evaluatedAt;
        
      return evaluatedDate.getMonth() + 1 === selectedMonth && 
             evaluatedDate.getFullYear() === selectedYear;
    });

    // Calculate overall average rating for all tasks
    const totalRating = filteredTasks.reduce((sum, task) => sum + (task.rating || 0), 0);
    const totalTasks = filteredTasks.length;
    const overallAverageRating = totalTasks > 0 ? totalRating / totalTasks : 0;
    const averagePercentage = (overallAverageRating / 5) * 100; // Convert to percentage (assuming max rating is 5)

    // Group tasks by user
    const userTasks = filteredTasks.reduce((acc, task) => {
      if (!acc[task.assignedTo]) {
        acc[task.assignedTo] = [];
      }
      acc[task.assignedTo].push(task);
      return acc;
    }, {} as { [key: string]: Task[] });

    // Calculate incentives for each user
    const calculatedIncentives = Object.entries(userTasks).map(([userId, userTasks]) => {
      const user = users.find(u => u.uid === userId);
      const userName = user?.displayName || "Олдсонгүй";
      const taskCount = userTasks.length;
      const baseSalary = user?.salary || 0;

      let totalAmount = 0;
      let finalSalary = baseSalary;

      // Calculate incentive based on average percentage
      if (averagePercentage < 70) {
        // If below 70%, no incentive
        totalAmount = 0;
        finalSalary = baseSalary;
      } else if (averagePercentage >= 70 && averagePercentage <= 80) {
        // If between 70-80%, 10% of base salary as incentive
        totalAmount = baseSalary * 0.1;
        finalSalary = baseSalary;
      } else if (averagePercentage > 80) {
        // If above 80%, 20% of base salary as incentive
        totalAmount = baseSalary * 0.2;
        finalSalary = baseSalary;
      }

      return {
        userId,
        userName,
        month: selectedMonth,
        year: selectedYear,
        totalAmount,
        taskCount,
        totalRating,
        averageRating: overallAverageRating,
        averageAmount: totalAmount / totalTasks,
        salary: finalSalary
      };
    });

    setIncentives(calculatedIncentives);
  };

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
            Урамшуулал
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
          <div className="mb-6 flex items-center space-x-4">
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                Сар
              </label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {month}-р сар
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                Он
              </label>
              <select
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Хэрэглэгч
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Үндсэн цалин
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Даалгаврын тоо
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дундаж үнэлгээ
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Нийт урамшуулал
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Үндсэн цалин болон урамшуулал
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incentives.map((incentive) => (
                  <tr key={incentive.userId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {incentive.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {incentive.salary.toLocaleString()}₮
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {incentive.taskCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {incentive.averageRating.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {incentive.totalAmount.toLocaleString()}₮
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {(incentive.salary + incentive.totalAmount).toLocaleString()}₮
                    </td>
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