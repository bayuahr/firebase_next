import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

type Data = {
  success: boolean;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  try {
    const filePath = 'country.xlsx'

    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ success: false, message: "Invalid file path" });
    }

    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    const workbook = XLSX.readFile(resolvedPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    const writePromises = data.map((country) => {
      const iso2 = country["ISO2"];
      const docRef = doc(db, "countries", iso2);
      return setDoc(docRef, {
        name: [country["Country"]],
        iso2,
        image: country["Link"],
        publish: country["Publish"] === true || country["Publish"] === "TRUE",
        updatedAt: new Date(),
      });
    });

    await Promise.all(writePromises);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
