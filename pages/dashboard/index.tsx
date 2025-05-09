import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../../lib/firebase";
import Layout from "../../components/Layout"; // Pastikan Anda punya layout komponen untuk dashboard

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(app);

    // Mengecek status login user
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        setLoading(false);
        router.push("/login"); // Arahkan ke login jika tidak login
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
        {/* <p>Welcome, {user?.email}!</p> */}
        {/* Halaman dashboard Anda */}
      </div>
    </Layout>
  );
}
