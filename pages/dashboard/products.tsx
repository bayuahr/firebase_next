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
  id: number;
  label: string;
  days: number;
  type_limit: string;
  unit_limit: string;
  amount_limit: number;
  price: number;
  // isActive: string;
  sku: string;
};

// Tipe untuk produk
type Product = {
  product_id: string;
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
  const [searchText, setSearchText] = useState("");

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
            const base = { product_id: docSnap.id, ...docSnap.data() } as Product;

            // Cegah error jika variant_groups tidak ada atau bukan array
            if (!Array.isArray(base.variant_groups)) return [];

            return base.variant_groups.map((variant) => ({
              ...base,
              ...variant,
            }));
          });
          console.log(result)
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

    setPending(true); // Mulai loading

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        const productsMap = new Map<string, Product>();

        jsonData.forEach((row) => {
          const productId = row["product_id"];
          const variant: Variant = {
            id: row["id"],
            label: row["label"],
            days: Number(row["days"]),
            type_limit: row["type_limit"],
            unit_limit: row["unit_limit"],
            amount_limit: Number(row["amount_limit"] || 0),
            price: Number(row["price"]),
            sku: row["sku"],
          };

          if (!productsMap.has(productId)) {
            productsMap.set(productId, {
              product_id: productId,
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
          await setDoc(doc(db, "products_test", product.product_id), product);
        }

        alert("Import berhasil. Silakan reload.");
        window.location.reload();
      } catch (error) {
        console.error("Gagal mengimpor data:", error);
        alert("Terjadi kesalahan saat mengimpor file.");
        setPending(false); // Stop loading jika gagal
      }
    };

    reader.readAsBinaryString(file);
  };


  const handleExportToExcel = () => {
    // Menyesuaikan kolom dengan urutan di DataTable
    const exportData = data.map((item) => ({
      "Product ID": item.product_id,
      "Name": item.name,
      "Country": item.country.join(", "),
      "Variant Group": item.type_limit,
      "ID": item.id,
      "SKU": item.sku,
      "Price": item.price,
      "Type": item.type_limit,
      "Label": item.label,
      "Limit": `${item.amount_limit} ${item.unit_limit}`,
      "Days": item.days,
      "Priority": item.priority,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Estimasi lebar kolom berdasarkan panjang konten maksimal di setiap kolom
    const columnWidths = Object.keys(exportData[0] || {}).map((key: any) => {
      const maxLength = Math.max(
        key.length,
        ...exportData.map((row: any) => String(row[key] || "").length)
      );
      return { wch: maxLength + 2 }; // +2 padding
    });

    worksheet["!cols"] = columnWidths;

    // Ensure worksheet["!rows"] is an array
    if (!Array.isArray(worksheet["!rows"])) {
      worksheet["!rows"] = [];
    }

    // Styling header (opsional)
    worksheet["!rows"].unshift({ hidden: false });

    // Membuat workbook dan menambahkan sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    // Ekspor file Excel
    XLSX.writeFile(workbook, "products_export.xlsx");
  };


  const columns: TableColumn<Row>[] = [
    { name: "Product ID", selector: (row) => row.product_id, sortable: true, minWidth: '250px' },
    { name: "Name", selector: (row) => row.name, sortable: true, minWidth: '250px' },
    { name: "Country", selector: (row) => row.country.join(", "), sortable: true, minWidth: '250px' },
    { name: "Variant Group", selector: (row) => row.type_limit, sortable: true, minWidth: '130px' },
    { name: "ID", selector: (row) => row.id, sortable: true, minWidth: '80px' },
    { name: "SKU", selector: (row) => row.sku, sortable: true, minWidth: '300px' },
    { name: "Price", selector: (row) => `${row.price.toLocaleString("id-ID")}`, sortable: true, right: true, minWidth: '100px' },
    { name: "Type", selector: (row) => row.type, sortable: true, minWidth: '100px' },
    { name: "Label", selector: (row) => row.label, sortable: true, minWidth: '200px', wrap: true },
    { name: "Limit", selector: (row) => `${row.amount_limit} ${row.unit_limit}`, sortable: true, minWidth: '120px' },
    { name: "Days", selector: (row) => row.days, sortable: true, minWidth: '80px' },
    { name: "Priority", selector: (row) => row.priority, sortable: true, minWidth: '100px' },
  ];

  const filteredData = data.filter((item) => {
    const search = searchText.toLowerCase();
    return (
      item.name.toLowerCase().includes(search) || item.label.toLowerCase().includes(search)
    );
  });
  


  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Master Product Variants</h1>

        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-2 sm:mb-0">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Search
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cari produk"
              className="w-full sm:w-64 border-gray-300 rounded-md shadow-sm text-sm p-2"
            />
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <input
              type="file"
              accept=".xlsx"
              onChange={handleImportExcel}
              className="block text-sm file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
            />
            <button
              onClick={handleExportToExcel}
              className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
            >
              Export to Excel
            </button>
            <button
              onClick={handleDeleteAll}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded"
            >
              Delete All
            </button>
          </div>
        </div>


        <DataTable
          columns={columns}
          data={filteredData}
          progressPending={pending}
          pagination
          highlightOnHover
          responsive
          striped
          noDataComponent={<div className="text-gray-500 py-4 text-center">Tidak ada data produk.</div>}
          customStyles={{
            cells: {
              style: {
                whiteSpace: 'normal',
                wordWrap: 'break-word',
              },
            },
          }}
        />
      </div>
    </Layout>
  );
}
