import { useEffect, useState } from "react";
import { app, db } from "../../lib/firebase";
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    setDoc,
    Timestamp,
} from "firebase/firestore";
import DataTable, { TableColumn } from "react-data-table-component";
import * as XLSX from "xlsx";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";


// Type for banner data
type Banner = {
    id?: string; // Document ID will be added when fetched
    imageUrl: string;
    title: string;
    description: string;
    targetUrl: string;
    isActive: boolean;
    priority: number;
    startDate: Timestamp;
    endDate: Timestamp;
    createdAt: Timestamp;
};

export default function MasterBannersPage() {
    const [data, setData] = useState<Banner[]>([]);
    const [pending, setPending] = useState(true);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [searchText, setSearchText] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        targetUrl: "",
        isActive: true,
        priority: 1,
        startDate: "",
        endDate: "",
        imageFile: null as File | null,
    });


    const router = useRouter();

    // Fetch data from Firestore
    useEffect(() => {
        const fetchDocs = async () => {
            const auth = getAuth(app);

            // Check user login status
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    setUser(user);
                    setLoading(false);
                    const snapshot = await getDocs(collection(db, "banners"));
                    const result: Banner[] = snapshot.docs.map((docSnap) => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                    })) as Banner[];
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

    const handleAddBanner = async () => {
        if (!formData.imageFile) {
            alert("Please select an image file.");
            return;
        }

        try {
            const storage = getStorage(app);
            const storageRef = ref(storage, `banners/${Date.now()}_${formData.imageFile.name}`);
            const snapshot = await uploadBytes(storageRef, formData.imageFile);
            const imageUrl = await getDownloadURL(snapshot.ref);

            const bannerData: Banner = {
                title: formData.title,
                description: formData.description,
                targetUrl: formData.targetUrl,
                isActive: formData.isActive,
                priority: formData.priority,
                startDate: Timestamp.fromDate(new Date(formData.startDate)),
                endDate: Timestamp.fromDate(new Date(formData.endDate)),
                createdAt: Timestamp.now(),
                imageUrl,
            };

            const newDocRef = doc(collection(db, "banners"));
            await setDoc(newDocRef, bannerData);

            setData([...data, { ...bannerData, id: newDocRef.id }]);
            alert("Banner added successfully!");

            // Reset form
            setFormData({
                title: "",
                description: "",
                targetUrl: "",
                isActive: true,
                priority: 1,
                startDate: "",
                endDate: "",
                imageFile: null,
            });

        } catch (err) {
            console.error(err);
            alert("Failed to upload and add banner.");
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm("Delete all banners? This action cannot be undone.")) return;

        setPending(true);
        try {
            const snapshot = await getDocs(collection(db, "banners"));

            const deletePromises = snapshot.docs.map((docSnap) => {
                return deleteDoc(doc(db, "banners", docSnap.id));
            });

            await Promise.all(deletePromises);

            setData([]);
            alert("All banners deleted successfully.");
        } catch (err) {
            alert("Failed to delete all banners.");
        } finally {
            setPending(false);
        }
    };


    const handleExportToExcel = () => {
        const exportData = data.map((item) => ({
            "ID": item.id,
            "Image URL": item.imageUrl,
            "Title": item.title,
            "Description": item.description,
            "Target URL": item.targetUrl,
            "Is Active": item.isActive ? "TRUE" : "FALSE",
            "Priority": item.priority,
            "Start Date": item.startDate.toDate().toLocaleDateString(),
            "End Date": item.endDate.toDate().toLocaleDateString(),
            "Created At": item.createdAt.toDate().toLocaleDateString(),
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Column widths
        const columnWidths = Object.keys(exportData[0] || {}).map((key: any) => {
            const maxLength = Math.max(
                key.length,
                ...exportData.map((row: any) => String(row[key] || "").length)
            );
            return { wch: maxLength + 2 };
        });

        worksheet["!cols"] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Banners");

        XLSX.writeFile(workbook, "banners_export.xlsx");
    };

    const columns: TableColumn<Banner>[] = [
        { name: "ID", selector: (row) => row.id || "", sortable: true, minWidth: '200px' },
        { name: "Title", selector: (row) => row.title, sortable: true, minWidth: '200px' },
        { name: "Description", selector: (row) => row.description, sortable: true, minWidth: '250px', wrap: true },
        { name: "Image URL", selector: (row) => row.imageUrl, sortable: true, minWidth: '300px', wrap: true },
        { name: "Target URL", selector: (row) => row.targetUrl, sortable: true, minWidth: '200px', wrap: true },
        { name: "Active", selector: (row) => row.isActive ? "Yes" : "No", sortable: true, minWidth: '80px' },
        { name: "Priority", selector: (row) => row.priority, sortable: true, minWidth: '80px' },
        { name: "Start Date", selector: (row) => row.startDate.toDate().toLocaleDateString(), sortable: true, minWidth: '120px' },
        { name: "End Date", selector: (row) => row.endDate.toDate().toLocaleDateString(), sortable: true, minWidth: '120px' },
    ];

    const filteredData = data.filter((item) => {
        const search = searchText.toLowerCase();
        return (
            item.title.toLowerCase().includes(search) ||
            item.description.toLowerCase().includes(search)
        );
    });

    useEffect(() => {
        if (showModal) {
          setFormData({
            title: "",
            targetUrl: "",
            description: "",
            priority: 0,
            isActive: true,
            startDate: "",
            endDate: "",
            imageFile: null,
          });
          setPreviewUrl(null);
        }
      }, [showModal]);
      

    return (
        <Layout>
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-auto">
                    <div className="bg-white rounded-lg w-full max-w-2xl p-6 shadow-lg relative max-h-screen overflow-y-auto">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-xl"
                        >
                            &times;
                        </button>

                        <h2 className="text-xl font-semibold mb-4">Add New Banner</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="p-2 border rounded w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
                                <input
                                    type="text"
                                    placeholder="Target URL"
                                    value={formData.targetUrl}
                                    onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                                    className="p-2 border rounded w-full"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    placeholder="Description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="p-2 border rounded w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <input
                                    type="number"
                                    placeholder="Priority"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                    className="p-2 border rounded w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.isActive ? "1" : "0"}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "1" })}
                                    className="p-2 border rounded w-full"
                                >
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="p-2 border rounded w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="p-2 border rounded w-full"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image File</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setFormData({ ...formData, imageFile: file });
                                            setPreviewUrl(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="p-2 border rounded col-span-1 sm:col-span-2"
                                />

                            </div>
                            {previewUrl && (
                                <div className="col-span-1 sm:col-span-2 mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Image Preview</label>
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="max-h-48 rounded border border-gray-300"
                                    />
                                </div>
                            )}

                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await handleAddBanner();
                                    setShowModal(false);
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <div className="p-6">
                <h1 className="text-2xl font-semibold mb-6">Master Banners</h1>

                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-2 sm:mb-0">
                        <label className="block text-sm font-medium mb-1 text-gray-700">
                            Search
                        </label>
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Search banners"
                            className="w-full sm:w-64 border-gray-300 rounded-md shadow-sm text-sm p-2"
                        />
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0">
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded"
                        >
                            + Add Banner
                        </button>

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
                    noDataComponent={<div className="text-gray-500 py-4 text-center">No banner data available.</div>}
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