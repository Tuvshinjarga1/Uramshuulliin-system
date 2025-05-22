'use client';

import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getTask, updateTask, deleteTask, updateTaskStatus } from "@/lib/tasks";
import { Task, User } from "@/types";
import { logoutUser } from "@/lib/auth";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";
import TaskCard from "@/components/TaskCard";

export default function EvaluationPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentDateTime] = useState("2025-05-21 08:43:01");

  const loadData = async () => {
    try {
      // Даалгаврын мэдээлэл авах
      const taskResult = await getTask(taskId);
      if (taskResult.success && taskResult.task) {
        const taskData = taskResult.task as Task;
        setTask(taskData);
        
        // Requirements-ийг parse хийх
        if (taskData.requirements) {
          try {
            const parsedRequirements = JSON.parse(taskData.requirements);
            setRequirements(parsedRequirements);
          } catch (error) {
            setRequirements([]);
          }
        }

        // Хариуцсан хэрэглэгчийн мэдээлэл авах
        if (taskData.assignedTo) {
          const userDoc = await getDoc(doc(db, "users", taskData.assignedTo));
          if (userDoc.exists()) {
            setAssignedUser({
              uid: userDoc.id,
              ...userDoc.data(),
            } as User);
          }
        }
      } else {
        setError("Даалгаврын мэдээлэл авахад алдаа гарлаа");
      }

      setLoading(false);
    } catch (error: any) {
      setError(error.message || "Мэдээлэл авахад алдаа гарлаа");
      setLoading(false);
    }
  };

  const handleRequirementChange = (index: number, value: string | number) => {
  const newRequirements = [...requirements];
  newRequirements[index] = {
 ...newRequirements[index],
   completed: Number(value),               // ← энд Number() нэмж өглөө
   percentage: Number(newRequirements[index].percentage)
 };
  setRequirements(newRequirements);
};


 const handleSaveEvaluation = async () => {
  if (task?.status !== 'completed') {
    setError('Зөвхөн дууссан даалгаврыг үнэлэх боломжтой');
    return;
  }

 const totalPercentage = requirements.reduce((sum, req) => {
 // `completed` талбарт таны үнэлгээ орж байна, тиймээс тэрний нийлбэрийг авъя
  const c = Number(req.completed);
  return sum + (isNaN(c) ? 0 : c);
 }, 0);


  setSubmitLoading(true);
  try {
    const updatedTask = {
      ...task,
      requirements: JSON.stringify(requirements),
      totalPercentage, // ← нийт хувь хадгалж байна
      evaluated: true,
      evaluatedAt: new Date()
    };
    const result = await updateTask(taskId, updatedTask);
    if (result.success) {
      await loadData();
      router.push('/admin/tasks');
    } else {
      setError(result.error || 'Хадгалахад алдаа гарлаа');
    }
  } catch (err: any) {
    setError(err.message || 'Хадгалахад алдаа гарлаа');
  } finally {
    setSubmitLoading(false);
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
  }, [router, taskId]);

  const handleDeleteTask = async () => {
    if (!window.confirm("Даалгаврыг устгахдаа итгэлтэй байна уу?")) {
      return;
    }

    setDeleteLoading(true);
    try {
      const result = await deleteTask(taskId);
      if (result.success) {
        router.push("/admin/tasks");
      } else {
        setError(result.error || "Даалгавар устгахад алдаа гарлаа");
      }
    } catch (error: any) {
      setError(error.message || "Даалгавар устгахад алдаа гарлаа");
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const handleStatusUpdate = async () => {
    await loadData();
  };
  
  const handleCancel = () => {
    router.push("/admin/tasks");
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

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Даалгавар олдсонгүй</div>
      </div>
    );
  }

  const formatDate = (date: Date | any) => {
    if (!date) return "Тодорхойгүй";
    if (typeof date === "string") {
      return new Date(date).toLocaleDateString("mn-MN");
    }
    return date.toDate
      ? date.toDate().toLocaleDateString("mn-MN")
      : new Date(date).toLocaleDateString("mn-MN");
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Үнэлгээний самбар
          </h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-gray-500">{currentDateTime}</div>
            <button
              onClick={() => router.push("/admin/tasks")}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white rounded-md border border-blue-600 hover:bg-blue-50"
            >
              Бүх даалгавар
            </button>
            <div className="text-sm font-medium text-gray-600">
              {currentUser?.displayName} (Админ)
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">{task.title}</h2>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full 
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
              </div>

              <div className="mb-6">
                <p className="text-gray-600 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Дуусах хугацаа</p>
                  <p className="font-medium">{formatDate(task.dueDate)}</p>
                </div>
              
                <div>
                  <p className="text-sm text-gray-500">Үүсгэсэн огноо</p>
                  <p className="font-medium">{formatDate(task.createdAt)}</p>
                </div>
                {task.completedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Дууссан огноо</p>
                    <p className="font-medium">
                      {formatDate(task.completedAt)}
                    </p>
                  </div>
                )}
              </div>

              {/* {task.fileUrl && task.fileType && task.fileType.startsWith('image/') && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Хавсаргасан зураг:</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="relative">
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      <img 
                        src={task.fileUrl}
                        alt={task.fileName || "Хавсаргасан зураг"}
                        className="w-full max-h-[400px] object-contain"
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
                      />
                    </div>
                    <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-sm text-gray-500">{task.fileName || "Зураг"}</span>
                      <a 
                        href={task.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Зургийг өөр цонхонд нээх
                      </a>
                    </div>
                  </div>
                </div>
              )} */}

              {task.requirements ? (
                (() => {
                  let requirementsArray = requirements;

                  return requirementsArray.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white shadow rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тавигдах шаардлага</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Үнэлгээ(%)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Гүйцэтгэсэн байдал</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
  {requirements.map((req, idx) => (
    <tr key={idx} className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-700">{req.title}</td>
      <td className="px-6 py-4 text-sm text-gray-700">{req.percentage}%</td>
      <td className="px-6 py-4 text-sm text-gray-700">
        <input
          type="number"
          min={0}
          max={100}
          className="border rounded px-2 py-1 w-24"
          value={req.completed ?? ''}            
          onChange={(e) => handleRequirementChange(idx, Number(e.target.value))}
          disabled={task?.status !== 'completed'}
          placeholder="0–100"
        />
      </td>
    </tr>
  ))}
</tbody>

                      </table>
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-lg font-medium text-gray-700">Нийт үнэлгээ:</span>
                          
                          <span className="text-xl font-bold text-blue-600">
                           {requirementsArray.reduce((sum, req) => sum + (Number(req.completed) || 0), 0)}%
                          </span>
                        </div>
                        
                        {/* Display evaluation image if available */}
                        {task.fileUrl && task.fileType && task.fileType.startsWith('image/') && (
                          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <div className="p-2 bg-gray-50 border-b border-gray-200">
                              <h4 className="text-sm font-medium text-gray-700">Үнэлгээний зураг:</h4>
                            </div>
                            <div className="p-4">
                              <div className="relative">
                                {imageLoading && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                  </div>
                                )}
                                <img 
                                  src={task.fileUrl}
                                  alt={task.fileName || "Үнэлгээний зураг"}
                                  className="w-full max-h-[300px] object-contain"
                                  onLoad={() => setImageLoading(false)}
                                  onError={() => setImageLoading(false)}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Шаардлага оруулаагүй байна.</p>
                  );
                })()
              ) : (
                <p className="text-sm text-gray-500">Шаардлага оруулаагүй байна.</p>
              )}

              {task.status === 'completed' && !task.evaluated && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-700">Энэ даалгавар дууссан тул үнэлгээ өгөх боломжтой.</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Цуцлах
                </button>
                {task.status === 'completed' && !task.evaluated && (
                  <button
                    type="button"
                    onClick={handleSaveEvaluation}
                    disabled={submitLoading}
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 ${
                      submitLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {submitLoading ? 'Хадгалж байна...' : 'Үнэлгээ хадгалах'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium mb-4">Хариуцагч</h3>

              {assignedUser ? (
                <div>
                  <p className="font-medium text-gray-900">
                    {assignedUser.displayName}
                  </p>
                  <p className="text-gray-600">{assignedUser.email}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Үүрэг:{" "}
                    {assignedUser.role === "admin"
                      ? "Админ"
                      : assignedUser.role === "accountant"
                      ? "Нягтлан"
                      : "Ажилтан"}
                  </p>

                  <button
                    onClick={() =>
                      router.push('/admin/users/${assignedUser.uid')
                    }
                    className="mt-4 px-3 py-1 text-sm font-medium text-blue-600 bg-white rounded-md border border-blue-600 hover:bg-blue-50"
                  >
                    Профайл харах
                  </button>
                </div>
              ) : (
                <p className="text-gray-600">Хариуцагч олдсонгүй</p>
              )}
            </div>
            
            {/* File information section */}
            {task.fileUrl && !task.fileType?.startsWith('image/') && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Хавсаргасан файл</h3>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <svg className="w-8 h-8 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <a 
                      href={task.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {task.fileName || "Хавсаргасан файл харах"}
                    </a>
                    <p className="text-sm text-gray-500">
                      {task.fileType || "Unknown file type"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}