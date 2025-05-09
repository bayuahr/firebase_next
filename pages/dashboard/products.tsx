import { useEffect, useState } from "react";
import { app, db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import DataTable, { TableColumn } from "react-data-table-component";
import * as XLSX from "xlsx";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Tipe untuk varian produk
type Variant = {
  label: string;
  days: number;
  type_limit: string;
  unit_limit: string;
  amount_limit: number;
  price: number;
  isActive: boolean;
  sku: string;
};

// Tipe untuk produk
type Product = {
  id: string;
  name: string;
  type: string;
  country: string[];
  priority: string;
  variant_groups: Variant[];
  validity_note: string;
};

// Gabungan Product + Variant untuk tampilan baris tabel
type Row = Product & Variant;

export default function MasterProductsPage() {
  const [data, setData] = useState<Row[]>([]);
  const [pending, setPending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Fetch data dari Firestore
  useEffect(() => {
    const fetchDocs = async () => {
      const auth = getAuth(app);

      // Mengecek status login user
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUser(user);
          setLoading(false);
          const snapshot = await getDocs(collection(db, "products_test"));
          const result: Row[] = snapshot.docs.flatMap((docSnap) => {
            const base = { id: docSnap.id, ...docSnap.data() } as Product;

            // Cegah error jika variant_groups tidak ada atau bukan array
            if (!Array.isArray(base.variant_groups)) return [];

            return base.variant_groups.map((variant) => ({
              ...base,
              ...variant,
            }));
          });

          setData(result);
          setPending(false);
        } else {
          setLoading(false);
          router.push("/login");
        }
      });

      return () => unsubscribe();

    };

    fetchDocs();
  }, []);



  // Updated handleDeleteAll function without batch
  const handleDeleteAll = async () => {
    if (!confirm("Delete all products? This action cannot be undone.")) return;

    setPending(true);
    try {
      const snapshot = await getDocs(collection(db, "products_test"));

      const deletePromises = snapshot.docs.map((docSnap) => {
        return deleteDoc(doc(db, "products_test", docSnap.id)); 
      });

      await Promise.all(deletePromises);

      setData([]); 
      alert("All products deleted successfully.");
    } catch (err) {
      alert("Failed to delete all products.");
    } finally {
      setPending(false);
    }
  };


  // Import data dari Excel
  const handleImportExcel = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      const productsMap = new Map<string, Product>();

      jsonData.forEach((row) => {
        const productId = row["product_id"];
        const variant: Variant = {
          label: row["label"],
          days: Number(row["days"]),
          type_limit: row["type_limit"],
          unit_limit: row["unit_limit"],
          amount_limit: Number(row["amount_limit"] || 0),
          price: Number(row["price"]),
          isActive: row["isActive"],
          sku: row["sku"],
        };

        if (!productsMap.has(productId)) {
          productsMap.set(productId, {
            id: productId,
            name: row["label"]?.split("-")?.[0]?.trim() || productId,
            type: row["type"],
            country: JSON.parse(row["country"]),
            priority: String(row["priority"]),
            variant_groups: [variant],
            validity_note: 'Must be activated within 30 days of purchase'
          });
        } else {
          productsMap.get(productId)?.variant_groups.push(variant);
        }
      });

      for (const product of productsMap.values()) {
        await setDoc(doc(db, "products_test", product.id), product);
      }

      alert("Import berhasil. Silakan reload.");
      window.location.reload();
    };

    reader.readAsBinaryString(file);
  };

  const handleExportToExcel = () => {
    const exportData = data.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      country: item.country.join(", "),
      priority: item.priority,
      label: item.label,
      days: item.days,
      type_limit: item.type_limit,
      unit_limit: item.unit_limit,
      amount_limit: item.amount_limit,
      price: item.price,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "products_export.xlsx");
  };

  const columns: TableColumn<Row>[] = [
    { name: "ID", selector: (row) => row.id, sortable: true },
    { name: "Name", selector: (row) => row.name, sortable: true },
    { name: "Country", selector: (row) => row.country.join(", "), sortable: true },
    { name: "Label", selector: (row) => row.label, sortable: true },
    { name: "Days", selector: (row) => row.days, sortable: true },
    { name: "Limit", selector: (row) => `${row.amount_limit} ${row.unit_limit}`, sortable: true },
    { name: "Type", selector: (row) => row.type_limit, sortable: true },
    { name: "Price", selector: (row) => `Rp ${row.price.toLocaleString("id-ID")}`, sortable: true, right: true },
  ];

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Master Product Variants</h1>

        <div className="mb-4 flex items-center">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Import Excel File
            </label>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleImportExcel}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
            />
          </div>
          <button
            onClick={handleExportToExcel}
            className="ml-4 mt-6 bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
          >
            Export to Excel
          </button>
          <button
            onClick={handleDeleteAll}
            className="ml-4 mt-6 bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded"
          >
            Delete All
          </button>
        </div>

        <DataTable
          columns={columns}
          data={data}
          progressPending={pending}
          pagination
          highlightOnHover
          responsive
          striped
          noDataComponent={<div className="text-gray-500 py-4 text-center">Tidak ada data produk.</div>}
        />
      </div>
    </Layout>
  );
}
