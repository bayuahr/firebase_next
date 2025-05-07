import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";  // Import Header

export default function Layout({ children }: { children: ReactNode }) {
    return (
      <div className="flex flex-col h-screen">
        <Header /> {/* Menambahkan Header di sini */}
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 bg-gray-100 min-h-screen"> {/* Ganti min-h-screen agar area konten juga memenuhi layar */}
            {children}
          </main>
        </div>
      </div>
    );
  }
  