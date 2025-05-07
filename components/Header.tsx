import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getAuth, signOut } from "firebase/auth";
import { app } from "../lib/firebase"; // Pastikan app terkonfigurasi dengan benar

const Header = () => {
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(app);

    // Mengecek status login pengguna
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      }
    });

    // Bersihkan listener ketika komponen unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const auth = getAuth(app);
    await signOut(auth);
    router.push("/login");
  };

  return (
    <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center">
      <div className="text-xl font-semibold text-white">Admin Panel</div>

      <div className="relative">
        {(
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <img
              src="https://img.freepik.com/free-vector/smiling-young-man-illustration_1308-174669.jpg?semt=ais_hybrid&w=740"
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="text-white">ADMIN</span>
          </div>
        )}

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 bg-white border shadow-lg rounded-lg w-48 z-10">
            <ul className="text-sm text-gray-700">
              <li>
                <button onClick={handleLogout} className="block px-4 py-2 w-full text-left text-red-500">
                  Logout
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
