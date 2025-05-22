"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { getAllTasks } from "@/lib/tasks";
import { User, Task } from "@/types";
import { logoutUser } from "@/lib/auth";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === "accountant") {
            setUser({ uid: currentUser.uid, ...userData });
            const usersSnapshot = await getDocs(collection(db, "users"));
            setUsers(usersSnapshot.docs.map(d => ({ uid: d.id, ...d.data() })) as User[]);
            const tasksResult = await getAllTasks();
            if (tasksResult.success) setTasks(tasksResult.tasks as Task[]);
          } else {
            await logoutUser(); router.push("/login");
          }
        } else {
          await logoutUser(); router.push("/login");
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => calculateIncentives(), [selectedMonth, selectedYear, tasks, users]);

  const calculateIncentives = () => {
    const filtered = tasks.filter(t => t.evaluated && t.evaluatedAt)
      .filter(t => {
        let evaluatedDate: Date;
        try {
          if (t.evaluatedAt instanceof Timestamp) {
            evaluatedDate = t.evaluatedAt.toDate();
          } else if ((t.evaluatedAt as any)?.toDate instanceof Function) {
            evaluatedDate = (t.evaluatedAt as any).toDate();
          } else {
            evaluatedDate = new Date(t.evaluatedAt as any);
          }
        } catch {
          return false;
        }
        return (
          evaluatedDate.getMonth() + 1 === selectedMonth &&
          evaluatedDate.getFullYear() === selectedYear
        );
      });

    const grouped = filtered.reduce((acc, t) => {
      acc[t.assignedTo] = acc[t.assignedTo] || [];
      acc[t.assignedTo].push(t);
      return acc;
    }, {} as Record<string, Task[]>);

    setIncentives(Object.entries(grouped).map(([uid, userTasks]) => {
      const info = users.find(u => u.uid === uid);
      const base = Number(info?.salary) || 0;
      const totalPct = userTasks.reduce((sum, task) => sum + (task.totalPercentage || 0), 0);
      const avgPct = userTasks.length ? totalPct / userTasks.length : 0;
      const incAmt = avgPct > 80 ? base * 0.2 : avgPct >= 70 ? base * 0.1 : 0;
      return {
        userId: uid,
        userName: info?.displayName || 'Өгөгдөлгүй',
        month: selectedMonth,
        year: selectedYear,
        baseSalary: base,
        incentiveAmount: incAmt,
        taskCount: userTasks.length,
        totalPercentage: totalPct,
        averagePercentage: avgPct,
        averageAmount: userTasks.length ? incAmt / userTasks.length : 0,
        totalSalary: base + incAmt
      };
    }));
  };

  const handleLogout = async () => { await logoutUser(); router.push("/login"); };
  const handleBack = () => router.back();

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    const element = printRef.current;
    const canvas = await html2canvas(element, {
      useCORS: true,
      backgroundColor: "#ffffff",
      foreignObjectRendering: true
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Incentives_${selectedYear}_${selectedMonth}.pdf`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Ачаалж байна...</div>;
  }

  const totalEmployees = incentives.length;
  const totalIncentives = incentives.reduce((sum, i) => sum + i.incentiveAmount, 0);
  const totalSalarySum = incentives.reduce((sum, i) => sum + i.totalSalary, 0);

  return (
    <div ref={printRef} className="min-h-screen bg-gray-100 text-black">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Урамшуулал</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.displayName} (Нягтлан)</span>
            <button onClick={handleLogout} className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700">Гарах</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="mb-6 flex space-x-4">
          <div>
            <label className="block text-sm">Сар</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)} className="mt-1 block border rounded p-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}-р сар</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm">Он</label>
            <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)} className="mt-1 block border rounded p-2">
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4 flex space-x-2">
          <button onClick={handleBack} className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700">Буцах</button>
          <button onClick={handleDownloadPDF} className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700">PDF татах</button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow"><p className="text-sm text-gray-500">Ажилтан тоо</p><p className="text-2xl font-bold">{totalEmployees}</p></div>
          <div className="bg-white p-4 rounded shadow"><p className="text-sm text-gray-500">Нийт урамшуулал</p><p className="text-2xl font-bold">{totalIncentives.toLocaleString()}₮</p></div>
          <div className="bg-white p-4 rounded shadow"><p className="text-sm text-gray-500">Нийт цалингийн нийлбэр</p><p className="text-2xl font-bold">{totalSalarySum.toLocaleString()}₮</p></div>
        </div>

        <div className="bg-white rounded shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50"><tr>{['Хэрэглэгч','Үндсэн цалин','Даалгаврын тоо','Дундаж хувь','Урамшуулал','Нийт цалин'].map(h =><th key={h} className="px-4 py-2 text-left text-xs uppercase text-gray-600">{h}</th>)}</tr></thead>
            <tbody>{incentives.map(i => (<tr key={i.userId} className="border-t"><td className="px-4 py-2 font-medium">{i.userName}</td><td className="px-4 py-2">{i.baseSalary.toLocaleString()}₮</td><td className="px-4 py-2">{i.taskCount}</td><td className="px-4 py-2">{i.averagePercentage.toFixed(1)}%</td><td className="px-4 py-2">{i.incentiveAmount.toLocaleString()}₮</td><td className="px-4 py-2">{i.totalSalary.toLocaleString()}₮</td></tr>))}</tbody>
          </table>
        </div>
      </main>
    </div>
  );
}