"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import imageCompression from "browser-image-compression";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASSWORD = "1234";

// 🏢 태룡토건 로고 이미지 경로 (public 폴더에 logo.png 저장 시 '/logo.png' 또는 이미지 URL 지정)
const COMPANY_LOGO_URL = "/logo.png"; 

interface WorkerItem {
  type: string;
  count: string;
  price: string;
}

interface EquipmentItem {
  name: string;
  count: string;
  price: string;
}

interface MaterialItem {
  name: string;
  count: string;
  unit: string;
  price: string;
}

interface DailyReport {
  id: number;
  created_at: string;
  date: string;
  site_name: string;
  author?: string;
  worker_details?: WorkerItem[];
  equipment_details?: EquipmentItem[];
  material_details?: MaterialItem[];
  today_work: string;
  tomorrow_plan?: string;
  photo_urls?: string[];
  total_cost?: number;
}

export default function WorkLogPage() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("전체");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [selectedModalImage, setSelectedModalImage] = useState<string | null>(null);

  const [priceHistory, setPriceHistory] = useState<{ [key: string]: string }>({
    보통인부: "180000",
    형틀목수: "250000",
    철근공: "250000",
    "굴착기 06W": "700000",
    "굴착기 03W": "600000",
    "25t 덤프": "650000",
    "레미콘(25-24-150)": "90000",
    "철근(HD10)": "950000",
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    siteName: "",
    author: "",
    todayWork: "",
    tomorrowPlan: "",
  });

  const [workerList, setWorkerList] = useState<WorkerItem[]>([
    { type: "보통인부", count: "", price: "180000" },
  ]);

  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([
    { name: "굴착기 06W", count: "", price: "700000" },
  ]);

  const [materialList, setMaterialList] = useState<MaterialItem[]>([
    { name: "", count: "", unit: "개", price: "" },
  ]);

  const [files, setFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);

  const extractPriceHistory = (data: DailyReport[]) => {
    const history: { [key: string]: string } = { ...priceHistory };
    data.forEach((r) => {
      r.worker_details?.forEach((w) => {
        if (w.type && w.price) history[w.type.trim()] = w.price;
      });
      r.equipment_details?.forEach((eq) => {
        if (eq.name && eq.price) history[eq.name.trim()] = eq.price;
      });
      r.material_details?.forEach((m) => {
        if (m.name && m.price) history[m.name.trim()] = m.price;
      });
    });
    setPriceHistory(history);
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*")
      .order("date", { ascending: false });

    if (!error && data) {
      setReports(data as DailyReport[]);
      extractPriceHistory(data as DailyReport[]);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAdminMode = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
    } else {
      const pwd = prompt("관리자 비밀번호를 입력해 주세요:");
      if (pwd === ADMIN_PASSWORD) {
        setIsAdminMode(true);
        alert("관리자 단가 모드가 활성화되었습니다.");
      } else if (pwd !== null) {
        alert("비밀번호가 일치하지 않습니다.");
      }
    }
  };

  const handleWorkerChange = (index: number, field: keyof WorkerItem, value: string) => {
    const updated = [...workerList];
    updated[index][field] = value;
    if (field === "type" && priceHistory[value.trim()]) {
      updated[index].price = priceHistory[value.trim()];
    }
    setWorkerList(updated);
  };

  const addWorkerRow = () => {
    setWorkerList([...workerList, { type: "", count: "", price: "" }]);
  };

  const removeWorkerRow = (index: number) => {
    if (workerList.length === 1) return;
    setWorkerList(workerList.filter((_, i) => i !== index));
  };

  const handleEquipmentChange = (index: number, field: keyof EquipmentItem, value: string) => {
    const updated = [...equipmentList];
    updated[index][field] = value;
    if (field === "name" && priceHistory[value.trim()]) {
      updated[index].price = priceHistory[value.trim()];
    }
    setEquipmentList(updated);
  };

  const addEquipmentRow = () => {
    setEquipmentList([...equipmentList, { name: "", count: "", price: "" }]);
  };

  const removeEquipmentRow = (index: number) => {
    if (equipmentList.length === 1) return;
    setEquipmentList(equipmentList.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: keyof MaterialItem, value: string) => {
    const updated = [...materialList];
    updated[index][field] = value;
    if (field === "name" && priceHistory[value.trim()]) {
      updated[index].price = priceHistory[value.trim()];
    }
    setMaterialList(updated);
  };

  const addMaterialRow = () => {
    setMaterialList([...materialList, { name: "", count: "", unit: "개", price: "" }]);
  };

  const removeMaterialRow = (index: number) => {
    if (materialList.length === 1) return;
    setMaterialList(materialList.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      siteName: "",
      author: "",
      todayWork: "",
      tomorrowPlan: "",
    });
    setWorkerList([{ type: "보통인부", count: "", price: priceHistory["보통인부"] || "180000" }]);
    setEquipmentList([{ name: "굴착기 06W", count: "", price: priceHistory["굴착기 06W"] || "700000" }]);
    setMaterialList([{ name: "", count: "", unit: "개", price: "" }]);
    setFiles([]);
    setExistingPhotos([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const calculateDailyTotalCost = () => {
    const workerCost = workerList.reduce((acc, w) => {
      const price = w.price || priceHistory[w.type.trim()] || "0";
      return acc + (parseFloat(w.count) || 0) * (parseFloat(price) || 0);
    }, 0);

    const equipCost = equipmentList.reduce((acc, eq) => {
      const price = eq.price || priceHistory[eq.name.trim()] || "0";
      return acc + (parseFloat(eq.count) || 0) * (parseFloat(price) || 0);
    }, 0);

    const matCost = materialList.reduce((acc, m) => {
      const price = m.price || priceHistory[m.name.trim()] || "0";
      return acc + (parseFloat(m.count) || 0) * (parseFloat(price) || 0);
    }, 0);

    return workerCost + equipCost + matCost;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.siteName.trim()) {
      alert("현장명을 입력해 주세요!");
      return;
    }

    setLoading(true);

    try {
      const uploadedPhotoUrls: string[] = [];

      for (const file of files) {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("report-photos")
          .getPublicUrl(fileName);

        uploadedPhotoUrls.push(urlData.publicUrl);
      }

      const finalPhotoUrls = files.length > 0 ? uploadedPhotoUrls : existingPhotos;

      const validWorkerList = workerList
        .filter((w) => w.type.trim() !== "" && w.count.trim() !== "")
        .map((w) => ({
          ...w,
          price: w.price || priceHistory[w.type.trim()] || "0",
        }));

      const validEquipmentList = equipmentList
        .filter((eq) => eq.name.trim() !== "" && eq.count.trim() !== "")
        .map((eq) => ({
          ...eq,
          price: eq.price || priceHistory[eq.name.trim()] || "0",
        }));

      const validMaterialList = materialList
        .filter((m) => m.name.trim() !== "" && m.count.trim() !== "")
        .map((m) => ({
          ...m,
          price: m.price || priceHistory[m.name.trim()] || "0",
        }));

      const dailyTotalCost = calculateDailyTotalCost();

      if (editingId) {
        const { error: updateError } = await supabase
          .from("daily_reports")
          .update({
            date: formData.date,
            site_name: formData.siteName,
            author: formData.author,
            worker_details: validWorkerList,
            equipment_details: validEquipmentList,
            material_details: validMaterialList,
            today_work: formData.todayWork,
            tomorrow_plan: formData.tomorrowPlan,
            photo_urls: finalPhotoUrls,
            total_cost: dailyTotalCost,
          })
          .eq("id", editingId);

        if (updateError) throw updateError;
        alert("작업일보가 수정되었습니다!");
      } else {
        const { error: dbError } = await supabase.from("daily_reports").insert([
          {
            date: formData.date,
            site_name: formData.siteName,
            author: formData.author,
            worker_details: validWorkerList,
            equipment_details: validEquipmentList,
            material_details: validMaterialList,
            today_work: formData.todayWork,
            tomorrow_plan: formData.tomorrowPlan,
            photo_urls: finalPhotoUrls,
            total_cost: dailyTotalCost,
          },
        ]);

        if (dbError) throw dbError;
        alert("작업일보가 등록되었습니다!");
      }

      resetForm();
      fetchReports();
    } catch (error: any) {
      console.error(error);
      alert(`처리 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (report: DailyReport) => {
    setEditingId(report.id);
    setFormData({
      date: report.date,
      siteName: report.site_name,
      author: report.author || "",
      todayWork: report.today_work,
      tomorrowPlan: report.tomorrow_plan || "",
    });
    setWorkerList(report.worker_details && report.worker_details.length > 0 ? report.worker_details : [{ type: "", count: "", price: "" }]);
    setEquipmentList(report.equipment_details && report.equipment_details.length > 0 ? report.equipment_details : [{ name: "", count: "", price: "" }]);
    setMaterialList(report.material_details && report.material_details.length > 0 ? report.material_details : [{ name: "", count: "", unit: "개", price: "" }]);
    setExistingPhotos(report.photo_urls || []);
    setFiles([]);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말로 이 작업일보를 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from("daily_reports").delete().eq("id", id);
      if (error) throw error;

      alert("삭제되었습니다.");
      fetchReports();
    } catch (error: any) {
      alert(`삭제 실패: ${error.message}`);
    }
  };

  const siteList = ["전체", ...Array.from(new Set(reports.map((r) => r.site_name).filter(Boolean)))];

  const filteredReports = reports.filter((r) => {
    const matchesSite = selectedSiteFilter === "전체" || r.site_name === selectedSiteFilter;
    const matchesMonth = selectedMonthFilter === "전체" || r.date.startsWith(selectedMonthFilter);
    return matchesSite && matchesMonth;
  });

  const calculateTotals = () => {
    const workerTotals: { [key: string]: { count: number; cost: number } } = {};
    const equipmentTotals: { [key: string]: { count: number; cost: number } } = {};
    const materialTotals: { [key: string]: { count: number; unit: string; cost: number } } = {};
    let totalWorkerCost = 0;
    let totalEquipCost = 0;
    let totalMatCost = 0;

    filteredReports.forEach((report) => {
      report.worker_details?.forEach((w) => {
        const count = parseFloat(w.count) || 0;
        const price = parseFloat(w.price) || 0;
        const cost = count * price;

        if (w.type) {
          if (!workerTotals[w.type]) workerTotals[w.type] = { count: 0, cost: 0 };
          workerTotals[w.type].count += count;
          workerTotals[w.type].cost += cost;
          totalWorkerCost += cost;
        }
      });

      report.equipment_details?.forEach((eq) => {
        const count = parseFloat(eq.count) || 0;
        const price = parseFloat(eq.price) || 0;
        const cost = count * price;

        if (eq.name) {
          if (!equipmentTotals[eq.name]) equipmentTotals[eq.name] = { count: 0, cost: 0 };
          equipmentTotals[eq.name].count += count;
          equipmentTotals[eq.name].cost += cost;
          totalEquipCost += cost;
        }
      });

      report.material_details?.forEach((m) => {
        const count = parseFloat(m.count) || 0;
        const price = parseFloat(m.price) || 0;
        const cost = count * price;

        if (m.name) {
          if (!materialTotals[m.name]) materialTotals[m.name] = { count: 0, unit: m.unit || "개", cost: 0 };
          materialTotals[m.name].count += count;
          materialTotals[m.name].cost += cost;
          totalMatCost += cost;
        }
      });
    });

    return { workerTotals, equipmentTotals, materialTotals, totalWorkerCost, totalEquipCost, totalMatCost };
  };

  const { workerTotals, equipmentTotals, materialTotals, totalWorkerCost, totalEquipCost, totalMatCost } = calculateTotals();

  const fetchImageAsBuffer = async (url: string): Promise<{ buffer: ArrayBuffer; extension: "jpeg" | "png" }> => {
    const response = await fetch(url);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const extension = url.toLowerCase().endsWith(".png") ? "png" : "jpeg";
    return { buffer, extension };
  };

  const exportToTemplateExcel = async () => {
    if (filteredReports.length === 0) {
      alert("다운로드할 일보 데이터가 없습니다.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const sortedReports = [...filteredReports].sort((a, b) => a.date.localeCompare(b.date));

      for (let index = 0; index < sortedReports.length; index++) {
        const report = sortedReports[index];
        const sheetName = `${report.date}_${index + 1}`;
        const ws = workbook.addWorksheet(sheetName);

        ws.columns = [
          { width: 15 },
          { width: 18 },
          { width: 12 },
          { width: 15 },
          { width: 18 },
          { width: 18 },
        ];

        ws.mergeCells("A1:D2");
        const titleCell = ws.getCell("A1");
        titleCell.value = "작 업 일 보";
        titleCell.font = { name: "맑은 고딕", size: 18, bold: true };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        ws.mergeCells("E1:E2");
        const appHeader = ws.getCell("E1");
        appHeader.value = "결\n재";
        appHeader.font = { name: "맑은 고딕", size: 10, bold: true };
        appHeader.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        appHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };

        ws.getCell("F1").value = "담 당";
        ws.getCell("F2").value = "소 장";
        [ws.getCell("F1"), ws.getCell("F2")].forEach((c) => {
          c.font = { name: "맑은 고딕", size: 10, bold: true };
          c.alignment = { horizontal: "center", vertical: "middle" };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
        });

        ws.getCell("A3").value = "일 자";
        ws.getCell("B3").value = report.date;
        ws.getCell("C3").value = "작 성 자";
        ws.getCell("D3").value = report.author || "-";
        ws.getCell("E3").value = "현 장 명";
        ws.getCell("F3").value = report.site_name;

        ["A3", "C3", "E3"].forEach((cellId) => {
          const c = ws.getCell(cellId);
          c.font = { name: "맑은 고딕", size: 10, bold: true };
          c.alignment = { horizontal: "center", vertical: "middle" };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F2FF" } };
        });

        ["B3", "D3", "F3"].forEach((cellId) => {
          const c = ws.getCell(cellId);
          c.font = { name: "맑은 고딕", size: 10 };
          c.alignment = { horizontal: "center", vertical: "middle" };
        });

        // 👷 인원 현황
        ws.mergeCells("A5:F5");
        const wHeader = ws.getCell("A5");
        wHeader.value = "👷 출력인원 현황";
        wHeader.font = { name: "맑은 고딕", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
        wHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };

        ws.getCell("A6").value = "직종";
        ws.getCell("B6").value = "인원(명)";
        ws.getCell("C6").value = "단가(원)";
        ws.mergeCells("D6:F6");
        ws.getCell("D6").value = "금액(원)";

        ["A6", "B6", "C6", "D6"].forEach((cellId) => {
          const c = ws.getCell(cellId);
          c.font = { name: "맑은 고딕", size: 10, bold: true };
          c.alignment = { horizontal: "center", vertical: "middle" };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
        });

        let rIdx = 7;
        let workerSumCost = 0;
        if (report.worker_details && report.worker_details.length > 0) {
          report.worker_details.forEach((w) => {
            const count = parseFloat(w.count) || 0;
            const price = parseFloat(w.price) || 0;
            const cost = count * price;
            workerSumCost += cost;

            ws.getCell(`A${rIdx}`).value = w.type;
            ws.getCell(`B${rIdx}`).value = count;
            ws.getCell(`C${rIdx}`).value = price;
            ws.mergeCells(`D${rIdx}:F${rIdx}`);
            ws.getCell(`D${rIdx}`).value = cost;

            ws.getCell(`B${rIdx}`).numFmt = "#,##0.0";
            ws.getCell(`C${rIdx}`).numFmt = "#,##0";
            ws.getCell(`D${rIdx}`).numFmt = "#,##0";

            ws.getCell(`A${rIdx}`).alignment = { horizontal: "center" };
            ws.getCell(`B${rIdx}`).alignment = { horizontal: "right" };
            ws.getCell(`C${rIdx}`).alignment = { horizontal: "right" };
            ws.getCell(`D${rIdx}`).alignment = { horizontal: "right" };

            rIdx++;
          });
        } else {
          ws.getCell(`A${rIdx}`).value = "내역 없음";
          ws.mergeCells(`B${rIdx}:F${rIdx}`);
          rIdx++;
        }

        ws.getCell(`A${rIdx}`).value = "노무비 소계";
        ws.mergeCells(`B${rIdx}:C${rIdx}`);
        ws.mergeCells(`D${rIdx}:F${rIdx}`);
        ws.getCell(`D${rIdx}`).value = workerSumCost;
        ws.getCell(`D${rIdx}`).numFmt = "#,##0";
        ws.getCell(`A${rIdx}`).font = { bold: true };
        ws.getCell(`D${rIdx}`).font = { bold: true, color: { argb: "FF1D4ED8" } };
        ws.getCell(`A${rIdx}`).alignment = { horizontal: "center" };
        ws.getCell(`D${rIdx}`).alignment = { horizontal: "right" };
        rIdx++;

        // 🚜 장비 현황
        ws.mergeCells(`A${rIdx}:F${rIdx}`);
        const eqHeader = ws.getCell(`A${rIdx}`);
        eqHeader.value = "🚜 투입장비 현황";
        eqHeader.font = { name: "맑은 고딕", size: 11, bold: true, color: { argb: "FF065F46" } };
        eqHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
        rIdx++;

        ws.getCell(`A${rIdx}`).value = "장비명";
        ws.getCell(`B${rIdx}`).value = "대수(대)";
        ws.getCell(`C${rIdx}`).value = "단가(원)";
        ws.mergeCells(`D${rIdx}:F${rIdx}`);
        ws.getCell(`D${rIdx}`).value = "금액(원)";

        [`A${rIdx}`, `B${rIdx}`, `C${rIdx}`, `D${rIdx}`].forEach((cellId) => {
          const c = ws.getCell(cellId);
          c.font = { name: "맑은 고딕", size: 10, bold: true };
          c.alignment = { horizontal: "center", vertical: "middle" };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
        });
        rIdx++;

        let equipSumCost = 0;
        if (report.equipment_details && report.equipment_details.length > 0) {
          report.equipment_details.forEach((eq) => {
            const count = parseFloat(eq.count) || 0;
            const price = parseFloat(eq.price) || 0;
            const cost = count * price;
            equipSumCost += cost;

            ws.getCell(`A${rIdx}`).value = eq.name;
            ws.getCell(`B${rIdx}`).value = count;
            ws.getCell(`C${rIdx}`).value = price;
            ws.mergeCells(`D${rIdx}:F${rIdx}`);
            ws.getCell(`D${rIdx}`).value = cost;

            ws.getCell(`B${rIdx}`).numFmt = "#,##0.0";
            ws.getCell(`C${rIdx}`).numFmt = "#,##0";
            ws.getCell(`D${rIdx}`).numFmt = "#,##0";

            ws.getCell(`A${rIdx}`).alignment = { horizontal: "center" };
            ws.getCell(`B${rIdx}`).alignment = { horizontal: "right" };
            ws.getCell(`C${rIdx}`).alignment = { horizontal: "right" };
            ws.getCell(`D${rIdx}`).alignment = { horizontal: "right" };

            rIdx++;
          });
        } else {
          ws.getCell(`A${rIdx}`).value = "내역 없음";
          ws.mergeCells(`B${rIdx}:F${rIdx}`);
          rIdx++;
        }

        ws.getCell(`A${rIdx}`).value = "장비비 소계";
        ws.mergeCells(`B${rIdx}:C${rIdx}`);
        ws.mergeCells(`D${rIdx}:F${rIdx}`);
        ws.getCell(`D${rIdx}`).value = equipSumCost;
        ws.getCell(`D${rIdx}`).numFmt = "#,##0";
        ws.getCell(`A${rIdx}`).font = { bold: true };
        ws.getCell(`D${rIdx}`).font = { bold: true, color: { argb: "FF047857" } };
        ws.getCell(`A${rIdx}`).alignment = { horizontal: "center" };
        ws.getCell(`D${rIdx}`).alignment = { horizontal: "right" };
        rIdx++;

        // 📦 자재 현황
        ws.mergeCells(`A${rIdx}:F${rIdx}`);
        const matHeader = ws.getCell(`A${rIdx}`);
        matHeader.value = "📦 자재 반입 현황";
        matHeader.font = { name: "맑은 고딕", size: 11, bold: true, color: { argb: "FF92400E" } };
        matHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        rIdx++;

        ws.getCell(`A${rIdx}`).value = "자재명";
        ws.getCell(`B${rIdx}`).value = "수량(단위)";
        ws.getCell(`C${rIdx}`).value = "단가(원)";
        ws.mergeCells(`D${rIdx}:F${rIdx}`);
        ws.getCell(`D${rIdx}`).value = "금액(원)";

        [`A${rIdx}`, `B${rIdx}`, `C${rIdx}`, `D${rIdx}`].forEach((cellId) => {
          const c = ws.getCell(cellId);
          c.font = { name: "맑은 고딕", size: 10, bold: true };
          c.alignment = { horizontal: "center", vertical: "middle" };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
        });
        rIdx++;

        let matSumCost = 0;
        if (report.material_details && report.material_details.length > 0) {
          report.material_details.forEach((m) => {
            const count = parseFloat(m.count) || 0;
            const price = parseFloat(m.price) || 0;
            const cost = count * price;
            matSumCost += cost;

            ws.getCell(`A${rIdx}`).value = m.name;
            ws.getCell(`B${rIdx}`).value = `${count} ${m.unit || ""}`;
            ws.getCell(`C${rIdx}`).value = price;
            ws.mergeCells(`D${rIdx}:F${rIdx}`);
            ws.getCell(`D${rIdx}`).value = cost;

            ws.getCell(`C${rIdx}`).numFmt = "#,##0";
            ws.getCell(`D${rIdx}`).numFmt = "#,##0";

            ws.getCell(`A${rIdx}`).alignment = { horizontal: "center" };
            ws.getCell(`B${rIdx}`).alignment = { horizontal: "right" };
            ws.getCell(`C${rIdx}`).alignment = { horizontal: "right" };
            ws.getCell(`D${rIdx}`).alignment = { horizontal: "right" };

            rIdx++;
          });
        } else {
          ws.getCell(`A${rIdx}`).value = "내역 없음";
          ws.mergeCells(`B${rIdx}:F${rIdx}`);
          rIdx++;
        }

        ws.getCell(`A${rIdx}`).value = "자재비 소계";
        ws.mergeCells(`B${rIdx}:C${rIdx}`);
        ws.mergeCells(`D${rIdx}:F${rIdx}`);
        ws.getCell(`D${rIdx}`).value = matSumCost;
        ws.getCell(`D${rIdx}`).numFmt = "#,##0";
        ws.getCell(`A${rIdx}`).font = { bold: true };
        ws.getCell(`D${rIdx}`).font = { bold: true, color: { argb: "FFB45309" } };
        ws.getCell(`A${rIdx}`).alignment = { horizontal: "center" };
        ws.getCell(`D${rIdx}`).alignment = { horizontal: "right" };
        rIdx++;

        // 💰 총 합계
        ws.mergeCells(`A${rIdx}:C${rIdx}`);
        ws.getCell(`A${rIdx}`).value = "💰 금일 투입비 총 합계";
        ws.getCell(`A${rIdx}`).font = { name: "맑은 고딕", size: 11, bold: true };
        ws.getCell(`A${rIdx}`).alignment = { horizontal: "center", vertical: "middle" };
        ws.getCell(`A${rIdx}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF08A" } };

        ws.mergeCells(`D${rIdx}:F${rIdx}`);
        ws.getCell(`D${rIdx}`).value = workerSumCost + equipSumCost + matSumCost;
        ws.getCell(`D${rIdx}`).numFmt = "#,##0";
        ws.getCell(`D${rIdx}`).font = { name: "맑은 고딕", size: 12, bold: true, color: { argb: "FFB45309" } };
        ws.getCell(`D${rIdx}`).alignment = { horizontal: "right", vertical: "middle" };
        ws.getCell(`D${rIdx}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF08A" } };
        rIdx += 2;

        // 금일 작업 내용
        ws.mergeCells(`A${rIdx}:F${rIdx}`);
        const tHeader = ws.getCell(`A${rIdx}`);
        tHeader.value = "📝 금일 작업 내용";
        tHeader.font = { name: "맑은 고딕", size: 11, bold: true };
        tHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
        rIdx++;

        ws.mergeCells(`A${rIdx}:F${rIdx + 2}`);
        const tContent = ws.getCell(`A${rIdx}`);
        tContent.value = report.today_work;
        tContent.alignment = { vertical: "top", wrapText: true };
        rIdx += 3;

        // 명일 작업 예정
        if (report.tomorrow_plan) {
          ws.mergeCells(`A${rIdx}:F${rIdx}`);
          const tmHeader = ws.getCell(`A${rIdx}`);
          tmHeader.value = "📅 명일 작업 예정";
          tmHeader.font = { name: "맑은 고딕", size: 11, bold: true };
          tmHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
          rIdx++;

          ws.mergeCells(`A${rIdx}:F${rIdx + 1}`);
          const tmContent = ws.getCell(`A${rIdx}`);
          tmContent.value = report.tomorrow_plan;
          tmContent.alignment = { vertical: "top", wrapText: true };
          rIdx += 2;
        }

        // 📷 현장 사진 섹션 및 이미지 삽입
        if (report.photo_urls && report.photo_urls.length > 0) {
          ws.mergeCells(`A${rIdx}:F${rIdx}`);
          const photoHeader = ws.getCell(`A${rIdx}`);
          photoHeader.value = "📷 현장 사진";
          photoHeader.font = { name: "맑은 고딕", size: 11, bold: true };
          photoHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
          rIdx++;

          const photoRowStart = rIdx;
          const photoRowHeight = 120;
          
          for (let pIdx = 0; pIdx < report.photo_urls.length; pIdx++) {
            const photoUrl = report.photo_urls[pIdx];
            try {
              const { buffer, extension } = await fetchImageAsBuffer(photoUrl);
              const imageId = workbook.addImage({
                buffer,
                extension,
              });

              const colOffset = (pIdx % 3) * 2;
              const rowOffset = Math.floor(pIdx / 3) * 8;

              const targetRow = photoRowStart + rowOffset;
              ws.getRow(targetRow).height = photoRowHeight;

              ws.addImage(imageId, {
                tl: { col: colOffset, row: targetRow - 1 },
                ext: { width: 220, height: 150 },
                editAs: "oneCell",
              });
            } catch (imgError) {
              console.error("이미지 로드 실패:", imgError);
            }
          }

          const totalPhotoRows = Math.ceil(report.photo_urls.length / 3) * 8;
          rIdx += totalPhotoRows;
        }

        // 테두리 적용
        for (let row = 1; row < rIdx; row++) {
          for (let col = 1; col <= 6; col++) {
            const cell = ws.getCell(row, col);
            if (!cell.border) {
              cell.border = {
                top: { style: "thin", color: { argb: "FFCCCCCC" } },
                left: { style: "thin", color: { argb: "FFCCCCCC" } },
                bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
                right: { style: "thin", color: { argb: "FFCCCCCC" } },
              };
            }
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `표준작업일보_${selectedSiteFilter}_${selectedMonthFilter}.xlsx`);

    } catch (error: any) {
      console.error(error);
      alert(`엑셀 내보내기 실패: ${error.message}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-slate-100 min-h-screen space-y-8 text-gray-900">
      {/* 🖼️ 사진 확대 보기 모달 */}
      {selectedModalImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer"
          onClick={() => setSelectedModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={selectedModalImage}
              alt="현장사진 큰화면"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border-4 border-white"
            />
            <button
              onClick={() => setSelectedModalImage(null)}
              className="absolute top-2 right-2 bg-slate-900/80 text-white font-black text-lg w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-600 transition"
            >
              ✕
            </button>
            <span className="absolute bottom-2 text-white/80 text-xs font-medium bg-black/60 px-4 py-1.5 rounded-full">
              화면 아무 곳이나 클릭하면 닫힙니다
            </span>
          </div>
        </div>
      )}

      {/* 1. 작업일보 작성 / 수정 폼 */}
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-200">
        
        {/* 🏢 최상단 헤더: 태룡토건(주) 로고 및 타이틀 영역 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b gap-4">
          <div className="flex items-center gap-3">
            {/* 로고 연동 이미지 (public/logo.png 이미지 위치) */}
            <div className="h-10 flex items-center bg-white p-1 rounded">
              <img
                src={COMPANY_LOGO_URL}
                alt="태룡토건 로고"
                className="h-full object-contain"
                onError={(e) => {
                  // 로고가 없을 경우 기본 텍스트 대체 표시
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {editingId ? "✏️ 작업일보 수정하기" : "🏗️ 현장 작업일보 작성"}
              </h1>
              <p className="text-xs font-bold text-emerald-800">태룡토건(주) TAE RYONG CONSTRUCTION</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={toggleAdminMode}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                isAdminMode
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300"
              }`}
            >
              {isAdminMode ? "🔓 관리자 단가 모드 ON" : "🔒 단가 숨김 모드"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-200 px-3 py-1.5 rounded-lg"
              >
                수정 취소
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">일자</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-xl p-3 text-sm text-gray-900 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">작성자</label>
              <input
                type="text"
                name="author"
                placeholder="성함 입력"
                value={formData.author}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-xl p-3 text-sm text-gray-900 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">현장명</label>
            <input
              type="text"
              name="siteName"
              placeholder="현장명 입력 (예: OO현장)"
              value={formData.siteName}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl p-3 text-sm text-gray-900 font-semibold focus:border-blue-500"
              required
            />
          </div>

          {/* 👷 출력인원 상세 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-300 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-extrabold text-slate-800">👷 출력인원 상세</label>
              <button
                type="button"
                onClick={addWorkerRow}
                className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200"
              >
                + 직종 추가
              </button>
            </div>
            {workerList.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="직종 (예: 보통인부, 목수)"
                  value={item.type}
                  onChange={(e) => handleWorkerChange(index, "type", e.target.value)}
                  className="flex-1 border-2 border-gray-300 rounded-lg p-2 text-sm text-gray-900"
                />
                <input
                  type="number"
                  step="0.5"
                  placeholder="인원(명)"
                  value={item.count}
                  onChange={(e) => handleWorkerChange(index, "count", e.target.value)}
                  className="w-24 border-2 border-gray-300 rounded-lg p-2 text-sm text-gray-900 text-right"
                />
                <span className="text-sm font-bold text-gray-600">명</span>

                {isAdminMode && (
                  <input
                    type="number"
                    placeholder="단가(원)"
                    value={item.price}
                    onChange={(e) => handleWorkerChange(index, "price", e.target.value)}
                    className="w-28 border-2 border-amber-300 bg-amber-50 rounded-lg p-2 text-sm text-gray-900 text-right font-bold"
                  />
                )}

                {workerList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWorkerRow(index)}
                    className="text-xs font-bold text-red-600 hover:text-red-800 px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 🚜 투입장비 상세 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-300 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-extrabold text-slate-800">🚜 투입장비 상세</label>
              <button
                type="button"
                onClick={addEquipmentRow}
                className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200"
              >
                + 장비 추가
              </button>
            </div>
            {equipmentList.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="장비명 (예: 굴착기 06W)"
                  value={item.name}
                  onChange={(e) => handleEquipmentChange(index, "name", e.target.value)}
                  className="flex-1 border-2 border-gray-300 rounded-lg p-2 text-sm text-gray-900"
                />
                <input
                  type="number"
                  step="0.5"
                  placeholder="대수(대)"
                  value={item.count}
                  onChange={(e) => handleEquipmentChange(index, "count", e.target.value)}
                  className="w-24 border-2 border-gray-300 rounded-lg p-2 text-sm text-gray-900 text-right"
                />
                <span className="text-sm font-bold text-gray-600">대</span>

                {isAdminMode && (
                  <input
                    type="number"
                    placeholder="단가(원)"
                    value={item.price}
                    onChange={(e) => handleEquipmentChange(index, "price", e.target.value)}
                    className="w-28 border-2 border-amber-300 bg-amber-50 rounded-lg p-2 text-sm text-gray-900 text-right font-bold"
                  />
                )}

                {equipmentList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEquipmentRow(index)}
                    className="text-xs font-bold text-red-600 hover:text-red-800 px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 📦 자재 반입 상세 */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-extrabold text-amber-900">📦 자재 반입 상세</label>
              <button
                type="button"
                onClick={addMaterialRow}
                className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-200"
              >
                + 자재 추가
              </button>
            </div>
            {materialList.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="자재명 (예: 레미콘, 철근)"
                  value={item.name}
                  onChange={(e) => handleMaterialChange(index, "name", e.target.value)}
                  className="flex-1 border-2 border-gray-300 rounded-lg p-2 text-sm text-gray-900"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="수량"
                  value={item.count}
                  onChange={(e) => handleMaterialChange(index, "count", e.target.value)}
                  className="w-20 border-2 border-gray-300 rounded-lg p-2 text-sm text-gray-900 text-right"
                />
                <input
                  type="text"
                  placeholder="단위"
                  value={item.unit}
                  onChange={(e) => handleMaterialChange(index, "unit", e.target.value)}
                  className="w-16 border-2 border-gray-300 rounded-lg p-2 text-sm text-gray-900 text-center"
                />

                {isAdminMode && (
                  <input
                    type="number"
                    placeholder="단가(원)"
                    value={item.price}
                    onChange={(e) => handleMaterialChange(index, "price", e.target.value)}
                    className="w-28 border-2 border-amber-300 bg-amber-50 rounded-lg p-2 text-sm text-gray-900 text-right font-bold"
                  />
                )}

                {materialList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMaterialRow(index)}
                    className="text-xs font-bold text-red-600 hover:text-red-800 px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {isAdminMode && (
            <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl flex justify-between items-center text-sm">
              <span className="font-extrabold text-amber-900">💰 금일 예상 투입비 합계 (관리자용):</span>
              <strong className="text-lg text-amber-700 font-extrabold">
                {calculateDailyTotalCost().toLocaleString()} 원
              </strong>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">금일작업 내용</label>
            <textarea
              name="todayWork"
              rows={5}
              placeholder="오늘 진행한 작업 상세 내용"
              value={formData.todayWork}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl p-3 text-sm text-gray-900 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">명일작업 예정</label>
            <textarea
              name="tomorrowPlan"
              rows={3}
              placeholder="내일 진행할 작업 예정 사항"
              value={formData.tomorrowPlan}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl p-3 text-sm text-gray-900 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">현장사진 첨부</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              ref={fileInputRef}
              className="w-full text-xs text-gray-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {editingId && existingPhotos.length > 0 && files.length === 0 && (
              <p className="text-xs text-green-700 mt-1.5 font-bold">📷 기존 등록된 사진 {existingPhotos.length}장이 유지됩니다.</p>
            )}
            {files.length > 0 && (
              <p className="text-xs text-blue-700 mt-1.5 font-bold">선택된 새 사진: {files.length}장</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-extrabold py-4 rounded-2xl text-base shadow-lg transition duration-200 mt-4 ${
              editingId ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
            } disabled:bg-gray-400`}
          >
            {loading ? "처리 중입니다..." : editingId ? "작업일보 수정 완료하기" : "작업일보 제출하기"}
          </button>
        </form>
      </div>

      {/* 📊 2. 월별 / 현장별 투입비 누계 현황 요약판 */}
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-6 border border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-700 pb-3 gap-2">
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            📊 [{selectedMonthFilter === "전체" ? "전체 기간" : selectedMonthFilter}] [{selectedSiteFilter}] 누계
          </h2>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">총 누계 투입비</span>
            <strong className="text-xl text-yellow-400 font-black">
              {(totalWorkerCost + totalEquipCost + totalMatCost).toLocaleString()} 원
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700">
              <h3 className="font-bold text-blue-300">👷 노무비 누계</h3>
              <span className="text-xs text-blue-200 font-bold">{totalWorkerCost.toLocaleString()} 원</span>
            </div>
            {Object.keys(workerTotals).length === 0 ? (
              <p className="text-xs text-slate-400">등록된 인원 내역이 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {Object.entries(workerTotals).map(([type, data]) => (
                  <li key={type} className="flex justify-between border-b border-slate-700/50 pb-1">
                    <span>{type} ({data.count}명)</span>
                    <strong className="text-slate-200">{data.cost.toLocaleString()} 원</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700">
              <h3 className="font-bold text-emerald-300">🚜 장비비 누계</h3>
              <span className="text-xs text-emerald-200 font-bold">{totalEquipCost.toLocaleString()} 원</span>
            </div>
            {Object.keys(equipmentTotals).length === 0 ? (
              <p className="text-xs text-slate-400">등록된 장비 내역이 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {Object.entries(equipmentTotals).map(([name, data]) => (
                  <li key={name} className="flex justify-between border-b border-slate-700/50 pb-1">
                    <span>{name} ({data.count}대)</span>
                    <strong className="text-slate-200">{data.cost.toLocaleString()} 원</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700">
              <h3 className="font-bold text-amber-300">📦 자재비 누계</h3>
              <span className="text-xs text-amber-200 font-bold">{totalMatCost.toLocaleString()} 원</span>
            </div>
            {Object.keys(materialTotals).length === 0 ? (
              <p className="text-xs text-slate-400">등록된 자재 내역이 없습니다.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {Object.entries(materialTotals).map(([name, data]) => (
                  <li key={name} className="flex justify-between border-b border-slate-700/50 pb-1">
                    <span>{name} ({data.count}{data.unit})</span>
                    <strong className="text-slate-200">{data.cost.toLocaleString()} 원</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 📋 3. 일자별 작업일보 목록 */}
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-gray-200">
          <h2 className="text-2xl font-bold text-slate-900">
            📋 작업일보 목록 ({filteredReports.length}건)
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportToTemplateExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition flex items-center gap-1"
            >
              📥 표준 양식 엑셀 내보내기
            </button>

            <input
              type="month"
              value={selectedMonthFilter === "전체" ? "" : selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value || "전체")}
              className="border-2 border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white"
            />

            <select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="border-2 border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-700 bg-white"
            >
              {siteList.map((site, index) => (
                <option key={index} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <p className="text-center text-gray-600 py-12 text-sm font-medium">조회 조건에 해당하는 작업일보가 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {filteredReports.map((report) => (
              <div key={report.id} className="border-2 border-gray-200 rounded-2xl p-5 sm:p-6 bg-gray-50 space-y-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center border-b-2 border-gray-200 pb-3">
                  <span className="font-extrabold text-blue-700 text-lg">{report.date}</span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(report)}
                      className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                    >
                      ✏️ 수정
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition"
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-gray-600 font-medium">
                  <span>현장: <strong className="text-gray-900">{report.site_name}</strong> | 작성자: <strong className="text-gray-900">{report.author || "미기재"}</strong></span>
                  {report.total_cost && report.total_cost > 0 ? (
                    <span className="text-blue-800 font-extrabold text-sm">일 투입비: {report.total_cost.toLocaleString()} 원</span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm p-3 bg-white rounded-xl border border-gray-200">
                  <div>
                    <strong className="text-gray-900 font-extrabold block mb-1">👷 출력인원:</strong>
                    {report.worker_details && report.worker_details.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {report.worker_details.map((w, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 font-bold">
                            {w.type}: {w.count}명 {w.price ? `(${parseInt(w.price).toLocaleString()}원)` : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </div>

                  <div>
                    <strong className="text-gray-900 font-extrabold block mb-1">🚜 투입장비:</strong>
                    {report.equipment_details && report.equipment_details.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {report.equipment_details.map((eq, idx) => (
                          <span key={idx} className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                            {eq.name}: {eq.count}대 {eq.price ? `(${parseInt(eq.price).toLocaleString()}원)` : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </div>

                  <div>
                    <strong className="text-gray-900 font-extrabold block mb-1">📦 자재반입:</strong>
                    {report.material_details && report.material_details.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {report.material_details.map((m, idx) => (
                          <span key={idx} className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-bold">
                            {m.name}: {m.count}{m.unit} {m.price ? `(${parseInt(m.price).toLocaleString()}원)` : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-900 bg-white p-4 rounded-xl border border-gray-200">
                  <strong className="text-gray-900 font-extrabold">[금일작업]</strong>
                  <p className="whitespace-pre-wrap mt-2 leading-relaxed">{report.today_work}</p>
                </div>

                {report.tomorrow_plan && (
                  <div className="text-sm text-gray-700 bg-white p-4 rounded-xl border border-gray-200">
                    <strong className="text-gray-900 font-bold">[명일예정]</strong>
                    <p className="whitespace-pre-wrap mt-1.5 leading-relaxed">{report.tomorrow_plan}</p>
                  </div>
                )}

                {/* 🖼️ 클릭하면 크게 확대되는 현장사진 갤러리 */}
                {report.photo_urls && report.photo_urls.length > 0 && (
                  <div className="flex gap-2.5 overflow-x-auto pt-3 border-t-2 border-gray-200">
                    {report.photo_urls.map((url, idx) => (
                      <div key={idx} className="relative group cursor-pointer">
                        <img
                          src={url}
                          alt="현장사진"
                          onClick={() => setSelectedModalImage(url)}
                          className="w-24 h-24 object-cover rounded-xl border-2 border-gray-300 shadow-inner group-hover:opacity-80 transition"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold pointer-events-none">
                          🔍 확대
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}