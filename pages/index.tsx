import { useEffect } from "react";
import { useRouter } from "next/router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../lib/firebase"; // Pastikan app terkonfigurasi dengan benar

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(app);

    // Mengecek status login pengguna
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Jika sudah login, arahkan ke dashboard
        router.push("/dashboard");
      } else {
        // Jika belum login, arahkan ke login
        router.push("/dashboard");
      }
    });

    // Bersihkan listener ketika komponen unmount
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p>Loading...</p>
    </div>
  );
}
