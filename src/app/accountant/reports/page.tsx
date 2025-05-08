"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { getAllIncentives } from "@/lib/incentives";
import { Incentive, User } from "@/types";
import { logoutUser } from "@/lib/auth";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().getMonth() + 1 < 10
      ? `0${new Date().getMonth() + 1}`
      : `${new Date().getMonth() + 1}`
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
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

  const generatePDF = () => {
    setPdfLoading(true);

    // Тухайн сар, жилийн мэдээлэл
    const filteredIncentives = incentives.filter(
      (inc) =>
        inc.month === selectedMonth &&
        inc.year === selectedYear &&
        inc.status === "approved"
    );

    // PDF үүсгэх
    const doc = new jsPDF();

    // Тайлан гарчиг
    doc.setFontSize(18);
    doc.text(`Урамшууллын тайлан: ${selectedYear}-${selectedMonth}`, 14, 22);

    // Тайлан мэдээлэл
    doc.setFontSize(12);
    doc.text(`Огноо: ${new Date().toLocaleDateString("mn-MN")}`, 14, 30);
    doc.text(`Тайлан гаргасан: ${user?.displayName}`, 14, 38);

    // Хүснэгт
    const tableColumn = ["№", "Нэр", "И-мэйл", "Даалгаврын тоо", "Нийт дүн"];
    const tableRows = filteredIncentives.map((incentive, index) => {
      const userData = users.find((u) => u.uid === incentive.userId);
      return [
        (index + 1).toString(),
        userData?.displayName || "Хэрэглэгч олдсонгүй",
        userData?.email || "",
        incentive.taskCount.toString(),
        `${incentive.totalAmount.toLocaleString()} ₮`,
      ];
    });

    // Хүснэгт үүсгэх
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Нийт дүн
    const totalAmount = filteredIncentives.reduce(
      (sum, inc) => sum + inc.totalAmount,
      0
    );
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(
      `Нийт урамшууллын дүн: ${totalAmount.toLocaleString()} ₮`,
      14,
      finalY
    );

    // PDF татаж авах
    doc.save(`Incentive_Report_${selectedYear}_${selectedMonth}.pdf`);

    setPdfLoading(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Тайлан</h1>
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
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Тайлан үүсгэх</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                onClick={generatePDF}
                disabled={pdfLoading}
                className={`w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                  pdfLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {pdfLoading ? "Тайлан үүсгэж байна..." : "PDF тайлан үүсгэх"}
              </button>
            </div>
          </div>

          {/* Тайлангийн хүснэгт */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">
              {selectedYear} оны {selectedMonth}-р сарын урамшууллын тайлан
            </h3>

            {incentives.filter(
              (inc) =>
                inc.month === selectedMonth &&
                inc.year === selectedYear &&
                inc.status === "approved"
            ).length === 0 ? (
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-gray-600">
                  Энэ сард баталгаажсан урамшуулал байхгүй байна.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                      >
                        №
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                      >
                        Нэр
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                      >
                        И-мэйл
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                      >
                        Даалгаврын тоо
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                      >
                        Нийт дүн
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {incentives
                      .filter(
                        (inc) =>
                          inc.month === selectedMonth &&
                          inc.year === selectedYear &&
                          inc.status === "approved"
                      )
                      .map((incentive, index) => {
                        const userData = users.find(
                          (u) => u.uid === incentive.userId
                        );
                        return (
                          <tr key={incentive.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-b">
                              <div className="text-sm font-medium text-gray-900">
                                {userData?.displayName || "Хэрэглэгч олдсонгүй"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b">
                              {userData?.email || ""}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b">
                              {incentive.taskCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b">
                              {incentive.totalAmount.toLocaleString()} ₮
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={4}
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-b"
                      >
                        Нийт дүн
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-b">
                        {incentives
                          .filter(
                            (inc) =>
                              inc.month === selectedMonth &&
                              inc.year === selectedYear &&
                              inc.status === "approved"
                          )
                          .reduce((sum, inc) => sum + inc.totalAmount, 0)
                          .toLocaleString()}{" "}
                        ₮
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
