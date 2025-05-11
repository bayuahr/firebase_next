import Link from "next/link";

export default function Sidebar() {
    return (
      <div className="w-64 h-full bg-gray-800 text-white p-4">
        <nav className="space-y-4">
          <Link href="/dashboard" className="block hover:text-gray-300">Dashboard</Link>
          <Link href="/dashboard/products" className="block hover:text-gray-300">Master Products</Link>
          <Link href="/dashboard/banners" className="block hover:text-gray-300">Master Banner</Link>
          <Link href="/dashboard/history_transaksi" className="block hover:text-gray-300">History Transaksi</Link>
        </nav>
      </div>
    );
  }
  