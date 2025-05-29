import { useEffect, useState } from "react";
import { app, db } from "../../lib/firebase";
import {
    collection,
    getDocs,
} from "firebase/firestore";
import DataTable, { TableColumn } from "react-data-table-component";
import * as XLSX from "xlsx";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { getAuth, onAuthStateChanged } from "firebase/auth";

type Transaction = {
    id: string;
    order_id: string;
    user_id: string;
    email: string;
    total_price: number;
    payment_method: string;
    status: string;
    timestamp: any;
    items?: {
        label: string;
        price: number;
        product_id: string;
        product_name: string;
        quantity: number;
        sku: string;
        total: number;
        variant_id: 1;
    }[];
};

type FlattenedItem = {
    order_id: string,
    email: string;
    transaction_id: string;
    user_id: string;
    total_price: number;
    payment_method: string;
    status: string;
    timestamp: any;
    label: string;
    price: number;
    product_id: string;
    product_name: string;
    quantity: number;
    sku: string;
    total: number;
    variant_id: number;
};


export default function MasterTransactionHistory() {
    const [data, setData] = useState<FlattenedItem[]>([]);
    const [pending, setPending] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [user, setUser] = useState<any>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dataTransaction,setDataTransaction] = useState<Transaction[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchDocs = async () => {
            const auth = getAuth(app);

            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    setUser(user);
                    const snapshot = await getDocs(collection(db, "transaction_history"));
                    const result: Transaction[] = snapshot.docs.map((docSnap) => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                    })) as Transaction[];
                    setDataTransaction(result);
                    // Flatten all items with transaction context
                    const flattened = result.flatMap((txn) =>
                        (txn.items || []).map((item) => ({
                            order_id: txn.order_id,
                            email: txn.email,
                            transaction_id: txn.id,
                            user_id: txn.user_id,
                            total_price: txn.total_price,
                            payment_method: txn.payment_method,
                            status: txn.status,
                            timestamp: txn.timestamp,
                            ...item,
                        }))
                    );
                    setData(flattened);
                    setPending(false);
                } else {
                    router.push("/login");
                }
            });

            return () => unsubscribe();
        };

        fetchDocs();
    }, []);

    const handleRowDoubleClick = (row: FlattenedItem) => {
        const d:any = dataTransaction.find((txn:any) => txn.id === row.transaction_id);
        setSelectedTransaction(d);
        setIsModalOpen(true);
    };

    const handleExportToExcel = () => {
        const exportData = data.map((item) => ({
            "Transaction ID": item.transaction_id || '',
            "Order ID": item.order_id || '',
            "User ID": item.user_id || '',
            "Email": item.email || '',
            "SKU": item.sku || '',
            "Qty": item.quantity?.toString() || '0',
            "Price": (item.price ?? 0).toLocaleString(),
            "Subtotal": ((item.quantity ?? 0) * (item.price ?? 0)).toLocaleString(),
            "Status": item.status || '',
            "Created At": item.timestamp?.toDate?.().toLocaleString?.() || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const columnWidths = Object.keys(exportData[0] || {}).map((key) => {
            const maxLength = Math.max(
                key.length,
                ...exportData.map((row: any) => String(row[key] || "").length)
            );
            return { wch: maxLength + 2 };
        });

        worksheet["!cols"] = columnWidths;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
        XLSX.writeFile(workbook, "transactions_export.xlsx");
    };


    const columns: TableColumn<FlattenedItem>[] = [
        { name: "Transaction ID", selector: (row) => row.transaction_id || '', sortable: true },
        { name: "Order ID", selector: (row) => row.order_id || '', sortable: true },
        { name: "User ID", selector: (row) => row.user_id || '', sortable: true },
        { name: "Email", selector: (row) => row.email || '', sortable: true },
        { name: "SKU", selector: (row) => row.sku || '', sortable: true },
        { name: "Qty", selector: (row) => row.quantity?.toString() || '0', sortable: true },
        { name: "Price", selector: (row) => (row.price ?? 0).toLocaleString(), sortable: true },
        {
            name: "Subtotal",
            selector: (row) => ((row.quantity ?? 0) * (row.price ?? 0)).toLocaleString(),
            sortable: true,
        },
        { name: "Status", selector: (row) => row.status || '', sortable: true },
        {
            name: "Created At",
            selector: (row) => row.timestamp?.toDate?.().toLocaleString?.() || '',
            sortable: true,
        },
    ];



    const filteredData = data.filter((item) => {
        const search = searchText.toLowerCase();
        return (
            item.transaction_id.toLowerCase().includes(search)
        );
    });

    return (
        <Layout>
            <div className="p-6">
                <h1 className="text-2xl font-semibold mb-6">Transaction History</h1>

                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-2 sm:mb-0">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Search</label>
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Search by user or product"
                            className="w-full sm:w-64 border-gray-300 rounded-md shadow-sm text-sm p-2"
                        />
                    </div>
                    <button
                        onClick={handleExportToExcel}
                        className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded"
                    >
                        Export to Excel
                    </button>
                </div>

                <DataTable
                    columns={columns}
                    data={filteredData}
                    progressPending={pending}
                    onRowDoubleClicked={handleRowDoubleClick}
                    pagination
                    highlightOnHover
                    responsive
                    striped
                    noDataComponent={
                        <div className="text-gray-500 py-4 text-center">No transaction data available.</div>
                    }
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
            {isModalOpen && selectedTransaction && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-xl shadow-lg relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Transaction Detail</h2>
                        <div className="space-y-2 text-sm">
                            <p><strong>Transaction ID:</strong> {selectedTransaction.id}</p>
                            <p><strong>Order ID:</strong> {selectedTransaction.order_id}</p>
                            <p><strong>User ID:</strong> {selectedTransaction.user_id}</p>
                            <p><strong>Email:</strong> {selectedTransaction.email}</p>
                            <p><strong>Total Price:</strong> {selectedTransaction.total_price}</p>
                            <p><strong>Payment Method:</strong> {selectedTransaction.payment_method}</p>
                            <p><strong>Status:</strong> {selectedTransaction.status}</p>
                            <p><strong>Created At:</strong> {selectedTransaction.timestamp.toDate().toLocaleString()}</p>
                        </div>

                        {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2">Items</h3>
                                <table className="w-full text-sm border rounded overflow-hidden">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="text-center p-2 border">Name</th>
                                            <th className="text-center p-2 border">SKU</th>
                                            <th className="text-right p-2 border">Qty</th>
                                            <th className="text-right p-2 border">Price</th>
                                            <th className="text-right p-2 border">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTransaction.items.map((item, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="p-2 border">{item.label}</td>
                                                <td className="p-2 border text-right">{item.sku}</td>
                                                <td className="p-2 border text-right">{item.quantity}</td>
                                                <td className="p-2 border text-right">{item.price.toLocaleString()}</td>
                                                <td className="p-2 border text-right">
                                                    {(item.quantity * item.price).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                </div>
            )}

        </Layout>
    );
}
