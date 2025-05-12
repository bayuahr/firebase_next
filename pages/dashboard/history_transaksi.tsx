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
    user_id: string;
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

export default function MasterTransactionHistory() {
    const [data, setData] = useState<Transaction[]>([]);
    const [pending, setPending] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [user, setUser] = useState<any>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                    setData(result);
                    setPending(false);
                } else {
                    router.push("/login");
                }
            });

            return () => unsubscribe();
        };

        fetchDocs();
    }, []);

    const handleRowDoubleClick = (row: Transaction) => {
        setSelectedTransaction(row);
        setIsModalOpen(true);
    };

    const handleExportToExcel = () => {
        const exportData = data.map((item) => ({
            "Transaction ID": item.id,
            "User ID": item.user_id,
            "Total Price": item.total_price,
            "Payment Method": item.payment_method,
            "Status": item.status,
            "Created At": item.timestamp.toDate().toLocaleString(),
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

    const columns: TableColumn<Transaction>[] = [
        { name: "ID", selector: (row) => row.id, sortable: true, minWidth: '200px' },
        { name: "User ID", selector: (row) => row.user_id, sortable: true, minWidth: '300px' },
        { name: "Total Price", selector: (row) => row.total_price.toLocaleString('id-ID'), sortable: true },

        { name: "Payment Method", selector: (row) => row.payment_method, sortable: true },
        { name: "Status", selector: (row) => row.status, sortable: true },
        {
            name: "Created At",
            selector: (row) => row.timestamp.toDate().toLocaleString(),
            sortable: true,
        },
    ];

    const filteredData = data.filter((item) => {
        const search = searchText.toLowerCase();
        return (
            item.id.toLowerCase().includes(search)
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
                            <p><strong>User ID:</strong> {selectedTransaction.user_id}</p>
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
                                            <th className="text-left p-2 border">Name</th>
                                            <th className="text-right p-2 border">Qty</th>
                                            <th className="text-right p-2 border">Price</th>
                                            <th className="text-right p-2 border">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTransaction.items.map((item, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="p-2 border">{item.label}</td>
                                                <td className="p-2 border text-right">{item.quantity}</td>
                                                <td className="p-2 border text-right">{item.price.toLocaleString()}</td>
                                                <td className="p-2 border text-right">
                                                    {(item.quantity * item.price).toLocaleString('id-ID')}
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
