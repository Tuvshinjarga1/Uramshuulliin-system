"use client";

import { ChangeEvent, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getUserTasks, updateTaskStatus, updateTask } from "@/lib/tasks";
import { getUserIncentives } from "@/lib/incentives";
import { Task, Incentive } from "@/types";
import { logoutUser } from "@/lib/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedIncentive, setSelectedIncentive] = useState<Incentive | null>(
    null
  );
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const loadUserData = async (userId: string) => {
    // Хэрэглэгчийн даалгаврууд авах
    const tasksResult = await getUserTasks(userId);
    console.log("Даалгаврын мэдээлэл:", tasksResult);
    if (tasksResult.success) {
      setTasks(tasksResult.tasks as Task[]);
    }

    // Хэрэглэгчийн урамшууллын мэдээлэл авах
    const incentivesResult = await getUserIncentives(userId);
    if (incentivesResult.success) {
      setIncentives(incentivesResult.incentives as Incentive[]);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Хэрэглэгчийн профайл авах
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({ uid: currentUser.uid, ...userData });

          // Хэрэглэгчийн мэдээллийг авсны дараа даалгавруудыг ачаалах
          await loadUserData(currentUser.uid);
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

  const handleRefresh = async () => {
    if (user && user.uid) {
      setLoading(true);
      await loadUserData(user.uid);
      setLoading(false);
    }
  };

  // Ажил эхлүүлэх
  const handleStartTask = async (taskId: string) => {
    if (window.confirm("Энэ даалгаврыг эхлүүлэх үү?")) {
      setUpdating(taskId);
      const result = await updateTaskStatus(taskId, "in-progress");
      if (result.success) {
        // Хэрэглэгчийн даалгаврын жагсаалтыг шинэчлэх
        await loadUserData(user.uid);
      } else {
        alert("Алдаа гарлаа: " + result.error);
      }
      setUpdating(null);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, taskId: string) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("Файл сонгогдоогүй байна");
      return;
    }

    console.log("Сонгосон файл:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Файлын хэмжээ 10MB-ээс хэтрэхгүй байх ёстой");
      return;
    }

    // Check file type
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Зөвхөн PNG, JPG, PDF, DOC, DOCX, XLS, XLSX файл зөвшөөрөгдөнө");
      return;
    }

    try {
      setUpdating(taskId);
      setUploadedFile(null);
      
      // Initialize Firebase Storage
      const storage = getStorage();
      if (!storage) {
        throw new Error("Firebase Storage идэвхжээгүй байна");
      }

      // Create a unique file name
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `tasks/${taskId}/${fileName}`);
      
      // console.log("Файл хадгалах замыг бэлдэж байна:", storageRef.fullPath);
      
      // Upload file
      // console.log("Файл хадгалаж эхэлж байна...");
      let uploadResult;
      // try {
      //   uploadResult = await uploadBytes(storageRef, file);
      //   console.log("Файл хадгалагдлаа:", uploadResult);
      // } catch (uploadError: any) {
      //   console.error("Файл хадгалахад алдаа гарлаа:", uploadError);
      //   throw new Error(`Файл хадгалахад алдаа гарлаа: ${uploadError.message}`);
      // }

      // if (!uploadResult) {
      //   throw new Error("Файл хадгалахад алдаа гарлаа");
      // }

      // Get download URL
      // console.log("Файлын линк аваж байна...");
      // let downloadURL;
      // try {
      //   downloadURL = await getDownloadURL(storageRef);
      //   console.log("Файлын линк:", downloadURL);
      // } catch (urlError: any) {
      //   console.error("Файлын линк авахад алдаа гарлаа:", urlError);
      //   throw new Error(`Файлын линк авахад алдаа гарлаа: ${urlError.message}`);
      // }

      // if (!downloadURL) {
      //   throw new Error("Файлын линк авахад алдаа гарлаа");
      // }

      // Update the task with the file URL
      console.log("Даалгаврын мэдээллийг шинэчлэж байна...");
      const updateData = {
        //fileUrl: downloadURL,
        fileName: fileName,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      };
      console.log("Шинэчлэх мэдээлэл:", updateData);

      const updateResult = await updateTask(taskId, updateData);
      console.log("Шинэчлэлтийн үр дүн:", updateResult);

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Даалгаврын мэдээлэл шинэчлэхэд алдаа гарлаа");
      }

      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, ...updateData }
          : task
      ));
      
      // Update selected task if it's the current one
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updateData } : null);
      }

     // setUploadedFile(downloadURL);
      alert("Файл амжилттай хадгалагдлаа!");
      
      // Reload user data
      await loadUserData(user.uid);
    } catch (error: any) {
      console.error("Файл хадгалахад алдаа гарлаа:", error);
      alert(error.message || "Файл хадгалахад алдаа гарлаа. Дараа дахин оролдоно уу.");
      setUploadedFile(null);
    } finally {
      setUpdating(null);
    }
  };

  // Ажил гүйцэтгэсэн тэмдэглэх
  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    // if (!task?.fileUrl) {
    //   alert("Даалгаврыг дуусгахын өмнө файл хавсаргана уу!");
    //   return;
    // }

    if (window.confirm("Энэ даалгаврыг гүйцэтгэсэн гэж тэмдэглэх үү?")) {
      setUpdating(taskId);
      try {
        const result = await updateTaskStatus(taskId, "completed");
        if (result.success) {
          // Update local state
          setTasks(tasks.map(task => 
            task.id === taskId 
              ? { ...task, status: "completed" }
              : task
          ));
          
          // Update selected task if it's the current one
          if (selectedTask?.id === taskId) {
            setSelectedTask(prev => prev ? { ...prev, status: "completed" } : null);
          }

          alert("Даалгавар амжилттай дууслаа!");
          await loadUserData(user.uid); // Reload data after completion
        } else {
          throw new Error(result.error || "Даалгавар дуусгахад алдаа гарлаа");
        }
      } catch (error) {
        console.error("Даалгавар дуусгахад алдаа гарлаа:", error);
        alert("Даалгавар дуусгахад алдаа гарлаа.");
      } finally {
        setUpdating(null);
      }
    }
  };

  // Даалгаврын дэлгэрэнгүй мэдээлэл харах
  const viewTaskDetails = (task: Task) => {
    setSelectedTask(task);
  };

  // Даалгаврын дэлгэрэнгүй хаах
  const closeTaskDetails = () => {
    setSelectedTask(null);
  };

  // Урамшууллын дэлгэрэнгүй мэдээлэл харах
  const viewIncentiveDetails = (incentive: Incentive) => {
    setSelectedIncentive(incentive);
  };

  // Урамшууллын дэлгэрэнгүй хаах
  const closeIncentiveDetails = () => {
    setSelectedIncentive(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Хянах самбар</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
            >
              Дахин ачаалах
            </button>
            <div className="text-sm font-medium text-gray-600">
              {user?.displayName}
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
          {/* Даалгаврын хэсэг */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-black">
              Таны даалгаврууд
            </h2>
            {tasks.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-gray-600">
                  Одоогоор даалгавар байхгүй байна.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto text-black">
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
                        Төлөв
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Дуусах хугацаа
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Үйлдэл
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => viewTaskDetails(task)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {task.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {task.description.substring(0, 50)}...
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
                          {task.dueDate &&
                          typeof task.dueDate === "object" &&
                          "seconds" in task.dueDate
                            ? new Date(
                                task.dueDate.seconds * 1000
                              ).toLocaleDateString("mn-MN")
                            : typeof task.dueDate === "string"
                            ? new Date(task.dueDate).toLocaleDateString("mn-MN")
                            : "Тодорхойгүй"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {task.status === "pending" ? (
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleStartTask(task.id)}
                                disabled={updating === task.id}
                                className={`px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                                  updating === task.id
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                {updating === task.id
                                  ? "Ачаалж байна..."
                                  : "Эхлүүлэх"}
                              </button>
                            </div>
                          ) : task.status === "in-progress" ? (
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                disabled={updating === task.id}
                                className={`px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 ${
                                  updating === task.id
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                {updating === task.id
                                  ? "Ачаалж байна..."
                                  : "Дууссан"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {task.status === "completed"
                                ? "Гүйцэтгэсэн"
                                : "Үйлдэл хийх боломжгүй"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Урамшууллын хэсэг */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-black">
              Таны урамшуулал
            </h2>
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
                        Сар, жил
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Гүйцэтгэсэн даалгавар
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
                  <tbody className="divide-y divide-gray-200">
                    {incentives.map((incentive) => (
                      <tr
                        key={incentive.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => viewIncentiveDetails(incentive)}
                      >
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Даалгаврын дэлгэрэнгүй мэдээллийн модал */}
      {selectedTask && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{selectedTask.title}</h3>
                <button
                  onClick={closeTaskDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="mb-4">
                <div className="mb-2">
                  <span className="font-medium">Төлөв: </span>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${
                      selectedTask.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : selectedTask.status === "in-progress"
                        ? "bg-blue-100 text-blue-800"
                        : selectedTask.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedTask.status === "completed"
                      ? "Дууссан"
                      : selectedTask.status === "in-progress"
                      ? "Хийгдэж буй"
                      : selectedTask.status === "rejected"
                      ? "Цуцлагдсан"
                      : "Хүлээгдэж буй"}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Дуусах хугацаа: </span>
                  <span>
                    {selectedTask.dueDate &&
                    typeof selectedTask.dueDate === "object" &&
                    "seconds" in selectedTask.dueDate
                      ? new Date(
                          selectedTask.dueDate.seconds * 1000
                        ).toLocaleDateString("mn-MN")
                      : typeof selectedTask.dueDate === "string"
                      ? new Date(selectedTask.dueDate).toLocaleDateString(
                          "mn-MN"
                        )
                      : "Тодорхойгүй"}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Даалгавар үүссэн огноо: </span>
                  <span>
                    {selectedTask.createdAt
                      ? typeof selectedTask.createdAt === "object" &&
                        "seconds" in selectedTask.createdAt
                        ? new Date(
                            selectedTask.createdAt.seconds * 1000
                          ).toLocaleDateString("mn-MN")
                        : new Date(selectedTask.createdAt).toLocaleDateString(
                            "mn-MN"
                          )
                      : "Тодорхойгүй"}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Даалгаврын шаардлагууд:</h4>
                  {selectedTask.requirements ? (
                    (() => {
                  let requirementsArray = [];
                  try {
                    requirementsArray = JSON.parse(selectedTask.requirements);
                  } catch (error) {
                    requirementsArray = [];
                  }

                  return requirementsArray.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white shadow rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тавигдах шаардлага</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Үнэлгээ(%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {requirementsArray.map((req: any, index: number) => (
                            <tr key={req.id || index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{req.field1}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{req.field2}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Шаардлага оруулаагүй байна.</p>
                  );
                })()
                  ) : (
                    <p className="text-gray-500">Шаардлага оруулаагүй байна.</p>
                  )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                {selectedTask.status === "pending" && (
                  <button
                    onClick={() => {
                      handleStartTask(selectedTask.id);
                      closeTaskDetails();
                    }}
                    className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Эхлүүлэх
                  </button>
                )}

                {/* {selectedTask.status === "in-progress" && (
                  <div className="flex flex-col space-y-2"> */}





{/* 


                    <div className="mb-2">
                      <h4 className="font-medium mb-2">Файл хавсаргах:</h4>
                      {selectedTask.fileUrl ? (
                        <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-lg border border-green-200">
                          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex flex-col">
                            <a 
                              href={selectedTask.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              {selectedTask.fileName || "Хавсаргасан файл харах"}
                            </a>
                            {selectedTask.uploadedAt && (
                              <span className="text-xs text-gray-500 mt-1">
                                Хавсаргасан: {new Date(selectedTask.uploadedAt).toLocaleString('mn-MN')}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors duration-200">
                            <div className="space-y-1 text-center">
                              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <div className="flex text-sm text-gray-600">
                                <label htmlFor={`file-upload-${selectedTask.id}`} className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                  <span>Файл сонгох</span>
                                  <input
                                    id={`file-upload-${selectedTask.id}`}
                                    type="file"
                                    onChange={(e) => handleFileUpload(e, selectedTask.id)}
                                    className="sr-only"
                                    accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx"
                                    disabled={updating === selectedTask.id}
                                  />
                                </label>
                                <p className="pl-1">эсвэл файл чирж тавих</p>
                              </div>
                              <p className="text-xs text-gray-500">
                                PNG, JPG, PDF, DOC, DOCX, XLS, XLSX файл (10MB хүртэл)
                              </p>
                              {updating === selectedTask.id && (
                                <div className="mt-2">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                  <p className="text-sm text-gray-500 mt-1">Файл хадгалаж байна...</p>
                                </div>
                              )}
                            </div>
                          </div>
                          {!uploadedFile && !selectedTask.fileUrl && (
                            <p className="mt-2 text-sm text-red-500 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Даалгаврыг дуусгахын өмнө файл хавсаргана уу
                            </p>
                          )}
                          {uploadedFile && (
                            <p className="mt-2 text-sm text-green-500 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Файл амжилттай хавсаргагдлаа
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        handleCompleteTask(selectedTask.id);
                        closeTaskDetails();
                      }}
                      disabled={!selectedTask.fileUrl && !uploadedFile}
                      className={`px-3 py-1 text-sm font-medium text-white rounded-md 
                                ${(selectedTask.fileUrl || uploadedFile) ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"}`}
                    >
                      Дууссан
                    </button>
                  </div>

 */}
                {/* )} */}

                <button
                  onClick={closeTaskDetails}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Хаах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Урамшууллын дэлгэрэнгүй мэдээллийн модал */}
      {selectedIncentive && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">
                  Урамшуулал: {selectedIncentive.year}-{selectedIncentive.month}
                </h3>
                <button
                  onClick={closeIncentiveDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="mb-4">
                <div className="mb-2">
                  <span className="font-medium">Төлөв: </span>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${
                      selectedIncentive.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : selectedIncentive.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedIncentive.status === "approved"
                      ? "Баталгаажсан"
                      : selectedIncentive.status === "rejected"
                      ? "Цуцлагдсан"
                      : "Хүлээгдэж буй"}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">
                    Гүйцэтгэсэн даалгаврын тоо:{" "}
                  </span>
                  <span>{selectedIncentive.taskCount}</span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Нийт урамшууллын дүн: </span>
                  <span className="text-lg font-semibold text-blue-600">
                    {selectedIncentive.totalAmount.toLocaleString()} ₮
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Үүссэн огноо: </span>
                  <span>
                    {selectedIncentive.createdAt
                      ? typeof selectedIncentive.createdAt === "object" &&
                        "seconds" in selectedIncentive.createdAt
                        ? new Date(
                            selectedIncentive.createdAt.seconds * 1000
                          ).toLocaleDateString("mn-MN")
                        : new Date(
                            selectedIncentive.createdAt
                          ).toLocaleDateString("mn-MN")
                      : "Тодорхойгүй"}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-medium">Шинэчлэгдсэн огноо: </span>
                  <span>
                    {selectedIncentive.updatedAt
                      ? typeof selectedIncentive.updatedAt === "object" &&
                        "seconds" in selectedIncentive.updatedAt
                        ? new Date(
                            selectedIncentive.updatedAt.seconds * 1000
                          ).toLocaleDateString("mn-MN")
                        : new Date(
                            selectedIncentive.updatedAt
                          ).toLocaleDateString("mn-MN")
                      : "Тодорхойгүй"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={closeIncentiveDetails}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Хаах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
