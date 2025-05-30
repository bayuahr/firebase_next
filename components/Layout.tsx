import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";  // Import Header

export default function Layout({ children }: { children: ReactNode }) {
    return (
      <div className="flex flex-col h-screen">
        <Header /> 
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 bg-gray-100 min-h-screen max-w-screen-xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }
  