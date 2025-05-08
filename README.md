# Enkul - Ажилтнуудын Урамшууллын Систем

Enkul нь Next.js болон Firebase дээр суурилсан ажилтнуудын урамшууллын систем юм. Энэхүү системээр дамжуулан компани нь ажилтнуудыг үр дүнд суурилсан урамшуулал олгох боломжтой.

## Үндсэн функцууд

### Хэрэглэгч (Ажилчид):

- Системд нэвтрэх
- Мэдээллээ хадгалах
- Мэдээлэл харах
- Мэдээллээ засах
- Мэдээллээ устгах
- Даалгавар гүйцэтгэх
- Даалгавар хүлээн авах
- Даалгавар илгээх
- Гүйцэтгэлийн мэдээлэл харах
- Урамшууллын мэдээлэл харах
- Тайланг PDF хэлбэрээр татаж авах

### Админ (Ахлах):

- Системд нэвтрэх
- Ажилтан бүртгэх
- Ажилтны жагсаалт харах
- Хайлт хийх
- Урамшуулал (Төрөл нэмэх, хасах, устгах)
- Даалгавар үүсгэх
- Гүйцэтгэл хүлээн авах
- Урамшуулал тооцоолох
- Тайланг PDF хэлбэрээр татаж авах

### Админ (Нягтлан):

- Системд нэвтрэх
- Ажилтны мэдээлэл харах
- Урамшуулал бодох (шалгах, батлах)
- Санхүүгийн тайлан гаргах

## Суулгах

```bash
# Clone the repository
git clone https://github.com/yourusername/enkul.git

# Install dependencies
cd enkul
npm install

# Create a .env.local file with your Firebase config
# Example:
# NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
# NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Run the development server
npm run dev
```

## Технологиуд

- [Next.js](https://nextjs.org/) - React framework
- [Firebase](https://firebase.google.com/) - Authentication, Firestore, Storage
- [Tailwind CSS](https://tailwindcss.com/) - UI framework
- [React Hook Form](https://react-hook-form.com/) - Form handling
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation

## Firebase Хуудасны Бүтэц

### Users Collection

```
/users/{userId}
- displayName: string
- email: string
- role: "employee" | "admin" | "accountant"
- createdAt: timestamp
- updatedAt: timestamp
```

### Tasks Collection

```
/tasks/{taskId}
- title: string
- description: string
- assignedTo: string (userId)
- assignedBy: string (userId)
- dueDate: timestamp
- incentiveAmount: number
- status: "pending" | "in-progress" | "completed" | "rejected"
- statusComment: string
- createdAt: timestamp
- updatedAt: timestamp
- completedAt: timestamp
```

### Incentives Collection

```
/incentives/{incentiveId}
- userId: string
- month: string
- year: string
- totalAmount: number
- taskCount: number
- tasks: string[] (taskIds)
- status: "pending" | "approved" | "rejected"
- statusComment: string
- createdAt: timestamp
- updatedAt: timestamp
```

### IncentiveTypes Collection

```
/incentiveTypes/{typeId}
- name: string
- description: string
- baseAmount: number
- createdAt: timestamp
- updatedAt: timestamp
```

Firebase-д хадгалагдах өгөгдлийн бүтэц:
/users/{userId}

- displayName: string
- email: string
- role: "employee" | "admin" | "accountant"
- createdAt: timestamp
- updatedAt: timestamp

/tasks/{taskId}

- title: string
- description: string
- assignedTo: string (userId)
- assignedBy: string (userId)
- dueDate: timestamp
- incentiveAmount: number
- status: "pending" | "in-progress" | "completed" | "rejected"
- statusComment: string
- createdAt: timestamp
- updatedAt: timestamp
- completedAt: timestamp

/incentives/{incentiveId}

- userId: string
- month: string
- year: string
- totalAmount: number
- taskCount: number
- tasks: string[] (taskIds)
- status: "pending" | "approved" | "rejected"
- statusComment: string
- createdAt: timestamp
- updatedAt: timestamp

/incentiveTypes/{typeId}

- name: string
- description: string
- baseAmount: number
- createdAt: timestamp
- updatedAt: timestamp
