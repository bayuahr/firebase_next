import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
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

type Variant = {
  label: string;
  days: number;
  type_limit: string;
  unit_limit: string;
  amount_limit: number;
  price: number;
};

type Product = {
  id: string;
  name: string;
  type: string;
  country: string[];
  priority: string;
  variant_groups: Variant[];
};

type Row = Product & Variant;

export default function MasterProductsPage() {
  const [data, setData] = useState<Row[]>([]);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      const snapshot = await getDocs(collection(db, "products"));
      const result: Row[] = snapshot.docs.flatMap((docSnap) => {
        const base = { id: docSnap.id, ...docSnap.data() } as Product;
        return base.variant_groups.map((variant) => ({
          ...base,
          ...variant,
        }));
      });

      setData(result);
      setPending(false);
    };

    fetchDocs();
  }, []);

  const handleEdit = (row: Row) => {
    alert(`Edit clicked for ID: ${row.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert("Failed to delete product");
    }
  };

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

      // Struktur ulang ke format Product[]
      const productsMap = new Map<string, Product>();

      jsonData.forEach((row) => {
        const productId = row["id"];
        const variant: Variant = {
          label: row["label"],
          days: Number(row["days"]),
          type_limit: row["type_limit"],
          unit_limit: row["unit_limit"],
          amount_limit: Number(row["amount_limit"]),
          price: Number(row["price"]),
        };

        if (!productsMap.has(productId)) {
          productsMap.set(productId, {
            id: productId,
            name: row["name"],
            type: row["type"],
            country: row["country"].split(",").map((c: string) => c.trim()),
            priority: row["priority"],
            variant_groups: [variant],
          });
        } else {
          productsMap.get(productId)?.variant_groups.push(variant);
        }
      });

      for (const product of productsMap.values()) {
        await setDoc(doc(db, "products", product.id), product);
      }

      alert("Import berhasil. Silakan reload.");
      window.location.reload();
    };

    reader.readAsBinaryString(file);
  };

  const columns: TableColumn<Row>[] = [
    { name: "ID", selector: (row) => row.id, sortable: true },
    { name: "Name", selector: (row) => row.name, sortable: true },
    {
      name: "Country",
      selector: (row) => row.country.join(", "),
      sortable: true,
    },
    { name: "Label", selector: (row) => row.label, sortable: true },
    { name: "Days", selector: (row) => row.days, sortable: true },
    {
      name: "Limit",
      selector: (row) => `${row.amount_limit} ${row.unit_limit}`,
      sortable: true,
    },
    { name: "Type", selector: (row) => row.type_limit, sortable: true },
    {
      name: "Price",
      selector: (row) => `Rp ${row.price.toLocaleString("id-ID")}`,
      sortable: true,
      right: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-2 py-1 rounded"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="bg-red-500 hover:bg-red-600 text-white text-sm px-2 py-1 rounded"
          >
            Delete
          </button>
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Master Product Variants</h1>

        <div className="mb-4 flex items-center justify-between">
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
        </div>

        <DataTable
          columns={columns}
          data={data}
          progressPending={pending}
          pagination
          highlightOnHover
          responsive
          striped
        />
      </div>
    </Layout>
  );
}
