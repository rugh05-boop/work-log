'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 📸 이미지 리사이징/압축 함수 (최대 해상도 1280px, 품질 0.7)
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.7
        );
      };
    };
  });
};

export default function WorkLogPage() {
  const [activeTab, setActiveTab] = useState<'form' | 'admin' | 'print' | 'summary' | 'edit'>('form');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // 일보 데이터 상태
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [writer, setWriter] = useState('');
  const [siteName, setSiteName] = useState('');
  const [weather, setWeather] = useState('맑음');

  // 주요 작업내용
  const [workEntries, setWorkEntries] = useState([
    { processName: '', detail: '' }
  ]);

  // 출력 인원 내역 (직종, 이름, 수량 - 단가는 관리자 전용)
  const [workerEntries, setWorkerEntries] = useState([
    { jobType: '', name: '', count: '1', price: '' }
  ]);

  // 장비 사용 내역
  const [equipmentEntries, setEquipmentEntries] = useState([
    { name: '', count: '', price: '', note: '' }
  ]);

  // 자재 반입 내역
  const [materialEntries, setMaterialEntries] = useState([
    { name: '', spec: '', count: '', unit: '', price: '' }
  ]);

  // 사진 업로드
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // 제출 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 저장된 일보 목록 및 수정용 상태
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [editingReport, setEditingReport] = useState<any>(null);

  // 🛑 입력창에서 엔터키 입력 시 자동 제출 방지 함수
  const preventEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // 비밀번호 확인 핸들러
  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '1234') {
      setIsAdminAuthenticated(true);
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  // 저장된 일보 불러오기
  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('work_logs')
      .select('*')
      .order('work_date', { ascending: false });

    if (!error && data) {
      setReports(data);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchReports();
    }
  }, [isAdminAuthenticated]);

  // 사진 첨부 및 자동 압축 처리
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const compressedFiles = await Promise.all(
        filesArray.map((file) => compressImage(file))
      );

      setPhotoFiles((prev) => [...prev, ...compressedFiles]);
      const newPreviews = compressedFiles.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  // 항목 추가/삭제 (작성 폼용)
  const addWorkEntry = () => setWorkEntries([...workEntries, { processName: '', detail: '' }]);
  const removeWorkEntry = (idx: number) => setWorkEntries(workEntries.filter((_, i) => i !== idx));

  const addWorkerEntry = () => setWorkerEntries([...workerEntries, { jobType: '', name: '', count: '1', price: '' }]);
  const removeWorkerEntry = (idx: number) => setWorkerEntries(workerEntries.filter((_, i) => i !== idx));

  const addEquipmentEntry = () => setEquipmentEntries([...equipmentEntries, { name: '', count: '', price: '', note: '' }]);
  const removeEquipmentEntry = (idx: number) => setEquipmentEntries(equipmentEntries.filter((_, i) => i !== idx));

  const addMaterialEntry = () => setMaterialEntries([...materialEntries, { name: '', spec: '', count: '', unit: '', price: '' }]);
  const removeMaterialEntry = (idx: number) => setMaterialEntries(materialEntries.filter((_, i) => i !== idx));

  // 📊 엑셀 (CSV) 다운로드 기능
  const exportToCSV = () => {
    if (reports.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += '일자,현장명,작성자,날씨,총투입인원(명),노무비(원),장비비(원),자재비(원),총합계금액(원)\n';

    reports.forEach((r) => {
      const totalWorkers = (r.worker_entries || r.work_entries || []).reduce(
        (acc: number, cur: any) => acc + (parseInt(cur.count) || 0),
        0
      );
      const laborCost = (r.worker_entries || r.work_entries || []).reduce(
        (acc: number, cur: any) => acc + (parseInt(cur.price) || 0) * (parseInt(cur.count) || 1),
        0
      );
      const eqCost = (r.equipment_entries || []).reduce((acc: number, cur: any) => acc + (parseInt(cur.price) || 0), 0);
      const matCost = (r.material_entries || []).reduce(
        (acc: number, cur: any) => acc + (parseInt(cur.price) || 0) * (parseInt(cur.count) || 1),
        0
      );
      const totalAmount = laborCost + eqCost + matCost;

      csvContent += `"${r.work_date}","${r.site_name}","${r.writer}","${r.weather}",${totalWorkers},${laborCost},${eqCost},${matCost},${totalAmount}\n`;
    });

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `작업일보_전체집계_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 제출 처리 (수동 제출)
  const handleManualSubmit = async () => {
    if (!siteName || !writer) {
      alert('현장명과 작성자는 필수 입력 항목입니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedPhotoUrls: string[] = [];
      for (const file of photoFiles) {
        const fileExt = 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage.from('work-photos').upload(fileName, file, {
          contentType: 'image/jpeg',
          upsert: true
        });

        if (!error && data) {
          const { data: publicData } = supabase.storage.from('work-photos').getPublicUrl(fileName);
          uploadedPhotoUrls.push(publicData.publicUrl);
        }
      }

      const { error } = await supabase.from('work_logs').insert([
        {
          work_date: workDate,
          writer,
          site_name: siteName,
          weather,
          work_entries: workEntries,
          worker_entries: workerEntries,
          equipment_entries: equipmentEntries,
          material_entries: materialEntries,
          photo_urls: uploadedPhotoUrls,
        },
      ]);

      if (error) throw error;

      alert('작업일보가 성공적으로 제출되었습니다!');
      setWriter('');
      setSiteName('');
      setWorkEntries([{ processName: '', detail: '' }]);
      setWorkerEntries([{ jobType: '', name: '', count: '1', price: '' }]);
      setEquipmentEntries([{ name: '', count: '', price: '', note: '' }]);
      setMaterialEntries([{ name: '', spec: '', count: '', unit: '', price: '' }]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
    } catch (err: any) {
      alert('제출 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✏️ 일보 수정 시작
  const startEditReport = (report: any) => {
    setEditingReport({
      ...report,
      work_entries: report.work_entries || [{ processName: '', detail: '' }],
      worker_entries: report.worker_entries || report.work_entries || [{ jobType: '', name: '', count: '1', price: '' }],
      equipment_entries: report.equipment_entries || [{ name: '', count: '', price: '', note: '' }],
      material_entries: report.material_entries || [{ name: '', spec: '', count: '', unit: '', price: '' }],
    });
    setActiveTab('edit');
  };

  // ✏️ 일보 수정 저장 (관리자가 인원/장비/자재 단가 입력)
  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('work_logs')
        .update({
          work_date: editingReport.work_date,
          writer: editingReport.writer,
          site_name: editingReport.site_name,
          weather: editingReport.weather,
          work_entries: editingReport.work_entries,
          worker_entries: editingReport.worker_entries,
          equipment_entries: editingReport.equipment_entries,
          material_entries: editingReport.material_entries,
        })
        .eq('id', editingReport.id);

      if (error) throw error;

      alert('작업일보 수정 및 단가 입력이 완료되었습니다!');
      await fetchReports();
      setActiveTab('admin');
    } catch (err: any) {
      alert('수정 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🗑️ 일보 삭제
  const handleDeleteReport = async (id: number) => {
    if (!confirm('정말 이 작업일보를 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase.from('work_logs').delete().eq('id', id);
      if (error) throw error;

      alert('작업일보가 삭제되었습니다.');
      await fetchReports();
      if (selectedReport && selectedReport.id === id) setSelectedReport(null);
    } catch (err: any) {
      alert('삭제 중 오류가 발생했습니다: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-6 text-slate-800">
      {/* 상단 탭 네비게이션 */}
      <div className="max-w-4xl mx-auto mb-4 bg-white rounded-lg shadow p-2 flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setActiveTab('form')}
          className={`px-4 py-2 rounded-md font-bold text-sm sm:text-base ${
            activeTab === 'form' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          📝 일보 작성
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-4 py-2 rounded-md font-bold text-sm sm:text-base ${
            activeTab === 'admin' || activeTab === 'edit' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          🔒 관리자 페이지
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-md font-bold text-sm sm:text-base ${
            activeTab === 'summary' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          📊 전체집계 (관리자)
        </button>
        <button
          onClick={() => setActiveTab('print')}
          className={`px-4 py-2 rounded-md font-bold text-sm sm:text-base ${
            activeTab === 'print' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          🖨️ 출력용 A4
        </button>
      </div>

      {/* 1. 일보 작성 폼 */}
      {activeTab === 'form' && (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-4 sm:p-8">
          <div className="border-b-2 border-emerald-600 pb-4 mb-6 text-center">
            <h1 className="text-xl sm:text-2xl font-extrabold text-emerald-800">(주)태룡토건 작업일보</h1>
          </div>

          <form onKeyDown={preventEnterSubmit} onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">작성일자</label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">작성자</label>
                <input
                  type="text"
                  placeholder="작성자 성함"
                  value={writer}
                  onChange={(e) => setWriter(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">현장명</label>
                <input
                  type="text"
                  placeholder="현장명 입력"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">날씨</label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                >
                  <option value="맑음">맑음</option>
                  <option value="구름조금">구름조금</option>
                  <option value="흐림">흐림</option>
                  <option value="비">비</option>
                  <option value="눈">눈</option>
                </select>
              </div>
            </div>

            {/* 주요 작업내용 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-700">🏗️ 주요 작업내용</h3>
                <button
                  type="button"
                  onClick={addWorkEntry}
                  className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold"
                >
                  + 항목 추가
                </button>
              </div>
              {workEntries.map((entry, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 p-2 border rounded bg-white">
                  <input
                    type="text"
                    placeholder="공종/작업명"
                    value={entry.processName}
                    onChange={(e) => {
                      const updated = [...workEntries];
                      updated[idx].processName = e.target.value;
                      setWorkEntries(updated);
                    }}
                    className="sm:w-1/3 border rounded p-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="세부 작업내용"
                    value={entry.detail}
                    onChange={(e) => {
                      const updated = [...workEntries];
                      updated[idx].detail = e.target.value;
                      setWorkEntries(updated);
                    }}
                    className="sm:w-2/3 border rounded p-1.5 text-sm"
                  />
                  {workEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWorkEntry(idx)}
                      className="text-red-500 font-bold px-2 text-sm self-end sm:self-center"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 👷 출력인원 작성 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-700">👷 출력인원 명단 (직종/이름/수량)</h3>
                <button
                  type="button"
                  onClick={addWorkerEntry}
                  className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold"
                >
                  + 인원 추가
                </button>
              </div>
              {workerEntries.map((entry, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 p-2 border rounded bg-white">
                  <input
                    type="text"
                    placeholder="직종 (예: 보통인부, 특별인부)"
                    value={entry.jobType}
                    onChange={(e) => {
                      const updated = [...workerEntries];
                      updated[idx].jobType = e.target.value;
                      setWorkerEntries(updated);
                    }}
                    className="sm:w-1/3 border rounded p-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="작업자 성함 (이름)"
                    value={entry.name}
                    onChange={(e) => {
                      const updated = [...workerEntries];
                      updated[idx].name = e.target.value;
                      setWorkerEntries(updated);
                    }}
                    className="sm:w-1/3 border rounded p-1.5 text-sm"
                  />
                  <div className="flex gap-1 items-center sm:w-1/3">
                    <input
                      type="number"
                      placeholder="수량"
                      value={entry.count}
                      onChange={(e) => {
                        const updated = [...workerEntries];
                        updated[idx].count = e.target.value;
                        setWorkerEntries(updated);
                      }}
                      className="w-20 border rounded p-1.5 text-sm"
                    />
                    <span className="text-xs text-slate-500">명</span>
                    {workerEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWorkerEntry(idx)}
                        className="text-red-500 font-bold px-2 text-sm ml-auto"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 장비 투입 내역 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-700">🚜 장비 투입 내역</h3>
                <button
                  type="button"
                  onClick={addEquipmentEntry}
                  className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold"
                >
                  + 항목 추가
                </button>
              </div>
              {equipmentEntries.map((entry, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 p-2 border rounded bg-white">
                  <input
                    type="text"
                    placeholder="장비명 (예: 06W 굴삭기)"
                    value={entry.name}
                    onChange={(e) => {
                      const updated = [...equipmentEntries];
                      updated[idx].name = e.target.value;
                      setEquipmentEntries(updated);
                    }}
                    className="sm:w-1/3 border rounded p-1.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="대수/시간"
                    value={entry.count}
                    onChange={(e) => {
                      const updated = [...equipmentEntries];
                      updated[idx].count = e.target.value;
                      setEquipmentEntries(updated);
                    }}
                    className="sm:w-1/4 border rounded p-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="비고"
                    value={entry.note}
                    onChange={(e) => {
                      const updated = [...equipmentEntries];
                      updated[idx].note = e.target.value;
                      setEquipmentEntries(updated);
                    }}
                    className="sm:w-1/3 border rounded p-1.5 text-sm"
                  />
                  {equipmentEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEquipmentEntry(idx)}
                      className="text-red-500 font-bold px-2 text-sm self-end sm:self-center"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 자재 반입 내역 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-700">📦 자재 반입 내역</h3>
                <button
                  type="button"
                  onClick={addMaterialEntry}
                  className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold"
                >
                  + 항목 추가
                </button>
              </div>
              {materialEntries.map((entry, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 p-2 border rounded bg-white">
                  <input
                    type="text"
                    placeholder="자재명"
                    value={entry.name}
                    onChange={(e) => {
                      const updated = [...materialEntries];
                      updated[idx].name = e.target.value;
                      setMaterialEntries(updated);
                    }}
                    className="sm:w-1/3 border rounded p-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="규격"
                    value={entry.spec}
                    onChange={(e) => {
                      const updated = [...materialEntries];
                      updated[idx].spec = e.target.value;
                      setMaterialEntries(updated);
                    }}
                    className="sm:w-1/3 border rounded p-1.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="수량"
                    value={entry.count}
                    onChange={(e) => {
                      const updated = [...materialEntries];
                      updated[idx].count = e.target.value;
                      setMaterialEntries(updated);
                    }}
                    className="sm:w-1/4 border rounded p-1.5 text-sm"
                  />
                  {materialEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMaterialEntry(idx)}
                      className="text-red-500 font-bold px-2 text-sm self-end sm:self-center"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 사진 첨부 */}
            <div>
              <h3 className="font-bold text-slate-700 mb-1">📷 현장 사진 첨부</h3>
              <p className="text-xs text-emerald-600 mb-2">⚡ 선택 시 사진 용량이 자동으로 최적화(압축)됩니다.</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 mb-2"
              />
              {photoPreviews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto p-2 bg-slate-50 rounded">
                  {photoPreviews.map((src, i) => (
                    <img key={i} src={src} alt="미리보기" className="h-20 w-20 object-cover rounded border" />
                  ))}
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow transition duration-200 text-base cursor-pointer"
            >
              {isSubmitting ? '사진 압축 및 제출 중...' : '작업일보 제출하기 (클릭)'}
            </button>
          </form>
        </div>
      )}

      {/* 2. 관리자 인증 */}
      {(activeTab === 'admin' || activeTab === 'summary' || activeTab === 'print' || activeTab === 'edit') && !isAdminAuthenticated && (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6 text-center mt-10">
          <h2 className="text-xl font-bold mb-4 text-slate-800">🔒 관리자 인증이 필요합니다</h2>
          <form onSubmit={handleAdminAuth} className="space-y-4">
            <input
              type="password"
              placeholder="비밀번호 입력 (기본: 1234)"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full border rounded p-2 text-center"
            />
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white font-bold py-2 rounded hover:bg-emerald-700"
            >
              인증하기
            </button>
          </form>
        </div>
      )}

      {/* 관리자 영역 */}
      {isAdminAuthenticated && (
        <>
          {/* 목록 관리 */}
          {activeTab === 'admin' && (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">📋 제출된 작업일보 목록 (단가입력 / 수정 / 삭제)</h2>
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">저장된 작업일보가 없습니다.</p>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className="border rounded p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 hover:bg-emerald-50 gap-2"
                    >
                      <div
                        className="cursor-pointer flex-1"
                        onClick={() => {
                          setSelectedReport(report);
                          setActiveTab('print');
                        }}
                      >
                        <div className="font-bold text-slate-800 text-base">{report.site_name}</div>
                        <div className="text-xs text-slate-500">
                          {report.work_date} | 작성자: {report.writer} | 날씨: {report.weather}
                        </div>
                      </div>

                      <div className="flex gap-2 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setActiveTab('print');
                          }}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded font-bold"
                        >
                          🖨️ A4 보기
                        </button>
                        <button
                          onClick={() => startEditReport(report)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-bold"
                        >
                          💰 단가 입력 / 수정
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded font-bold"
                        >
                          🗑️ 삭제
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ✏️ 일보 수정 폼 (관리자 단가 및 자재 단가 입력) */}
          {activeTab === 'edit' && editingReport && (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold text-blue-800">💰 인원/장비/자재 단가 입력 및 수정</h2>
                <button
                  onClick={() => setActiveTab('admin')}
                  className="text-xs bg-slate-300 text-slate-700 px-3 py-1.5 rounded font-bold"
                >
                  취소하고 돌아가기
                </button>
              </div>

              <form onKeyDown={preventEnterSubmit} onSubmit={handleUpdateReport} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">작성일자</label>
                    <input
                      type="date"
                      value={editingReport.work_date || ''}
                      onChange={(e) => setEditingReport({ ...editingReport, work_date: e.target.value })}
                      className="w-full border rounded p-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">작성자</label>
                    <input
                      type="text"
                      value={editingReport.writer || ''}
                      onChange={(e) => setEditingReport({ ...editingReport, writer: e.target.value })}
                      className="w-full border rounded p-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">현장명</label>
                    <input
                      type="text"
                      value={editingReport.site_name || ''}
                      onChange={(e) => setEditingReport({ ...editingReport, site_name: e.target.value })}
                      className="w-full border rounded p-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">날씨</label>
                    <select
                      value={editingReport.weather || '맑음'}
                      onChange={(e) => setEditingReport({ ...editingReport, weather: e.target.value })}
                      className="w-full border rounded p-2 text-sm"
                    >
                      <option value="맑음">맑음</option>
                      <option value="구름조금">구름조금</option>
                      <option value="흐림">흐림</option>
                      <option value="비">비</option>
                      <option value="눈">눈</option>
                    </select>
                  </div>
                </div>

                {/* 주요 작업내용 수정 */}
                <div>
                  <h3 className="font-bold text-slate-700 mb-2">🏗️ 주요 작업내용</h3>
                  {(editingReport.work_entries || []).map((entry: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 p-2 border rounded bg-white">
                      <input
                        type="text"
                        placeholder="공종/작업명"
                        value={entry.processName || ''}
                        onChange={(e) => {
                          const updated = [...editingReport.work_entries];
                          updated[idx].processName = e.target.value;
                          setEditingReport({ ...editingReport, work_entries: updated });
                        }}
                        className="sm:w-1/3 border rounded p-1.5 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="세부 작업내용"
                        value={entry.detail || ''}
                        onChange={(e) => {
                          const updated = [...editingReport.work_entries];
                          updated[idx].detail = e.target.value;
                          setEditingReport({ ...editingReport, work_entries: updated });
                        }}
                        className="sm:w-2/3 border rounded p-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>

                {/* 👷 인원 노무 단가 입력 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-700">👷 출력 인원 및 노무 단가 설정</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingReport({
                          ...editingReport,
                          worker_entries: [...(editingReport.worker_entries || []), { jobType: '', name: '', count: '1', price: '' }],
                        })
                      }
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold"
                    >
                      + 인원 추가
                    </button>
                  </div>
                  {(editingReport.worker_entries || []).map((entry: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 p-2 border rounded bg-white">
                      <input
                        type="text"
                        placeholder="직종"
                        value={entry.jobType || ''}
                        onChange={(e) => {
                          const updated = [...editingReport.worker_entries];
                          updated[idx].jobType = e.target.value;
                          setEditingReport({ ...editingReport, worker_entries: updated });
                        }}
                        className="sm:w-1/4 border rounded p-1.5 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="성함"
                        value={entry.name || ''}
                        onChange={(e) => {
                          const updated = [...editingReport.worker_entries];
                          updated[idx].name = e.target.value;
                          setEditingReport({ ...editingReport, worker_entries: updated });
                        }}
                        className="sm:w-1/4 border rounded p-1.5 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="수량(명)"
                        value={entry.count || '1'}
                        onChange={(e) => {
                          const updated = [...editingReport.worker_entries];
                          updated[idx].count = e.target.value;
                          setEditingReport({ ...editingReport, worker_entries: updated });
                        }}
                        className="w-20 border rounded p-1.5 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="노무 단가(원)"
                        value={entry.price || ''}
                        onChange={(e) => {
                          const updated = [...editingReport.worker_entries];
                          updated[idx].price = e.target.value;
                          setEditingReport({ ...editingReport, worker_entries: updated });
                        }}
                        className="sm:w-1/4 border rounded p-1.5 text-sm bg-blue-50 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingReport.worker_entries.filter((_: any, i: number) => i !== idx);
                          setEditingReport({ ...editingReport, worker_entries: updated });
                        }}
                        className="text-red-500 font-bold px-2 text-sm self-end sm:self-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* 🚜 장비 단가 입력 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-700">🚜 장비 투입 및 단가 설정</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingReport({
                          ...editingReport,
                          equipment_entries: [...(editingReport.equipment_entries || []), { name: '', count: '', price: '', note: '' }],
                        })
                      }
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold"
                    >
                      + 장비 추가
                    </button>
                  </div>
                  {(editingReport.equipment_entries || []).map((entry: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 p-2 border rounded bg-white">
                      <input
                        type="text"
                        placeholder="장비명"
                        value={entry.name || ''}
                        onChange={(e) => {
                          const updated = [...editingReport.equipment_entries];
                          updated[idx].name = e.target.value;
                          setEditingReport({ ...editingReport, equipment_entries: updated });
                        }}
                        className="sm:w-1/3 border rounded p-1.5 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="수량"
                        value={entry.count || ''}
                        onChange={(e) => {
                          const updated = [...editingReport.equipment_entries];
                          updated[idx].count = e.target.value;
                          setEditingReport({ ...editingReport, equipment_entries: updated });
                        }}
                        className="sm:w-1/4 border rounded p-1.5 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="장비 단가/금액(원)"
                        value={entry.price || ''}
                        onChange={(e) => {
                          const updated = [...editingReport.equipment_entries];
                          updated[idx].price = e.target.value;
                          setEditingReport({ ...editingReport, equipment_entries: updated });
                        }}
                        className="sm:w-1/3 border rounded p-1.5 text-sm bg-blue-50 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingReport.equipment_entries.filter((_: any, i: number) => i !== idx);
                          setEditingReport({ ...editingReport, equipment_entries: updated });
                        }}
                        className="text-red-500 font-bold px-2 text-sm self-end sm:self-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* 📦 자재 반입 및 단가 수정 (추가/삭제 및 입력란 완벽 활성화) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-700">📦 자재 반입 및 단가 설정</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingReport({
                          ...editingReport,
                          material_entries: [...(editingReport.material_entries || []), { name: '', spec: '', count: '', price: '' }],
                        })
                      }
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold"
                    >
                      + 자재 추가
                    </button>
                  </div>
                  {(editingReport.material_entries || []).length === 0 ? (
                    <p className="text-xs text-slate-400 p-2 border rounded bg-slate-50">반입된 자재 항목이 없습니다. 상단 [ + 자재 추가 ] 버튼으로 새로 등록할 수 있습니다.</p>
                  ) : (
                    editingReport.material_entries.map((entry: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 p-2 border rounded bg-white">
                        <input
                          type="text"
                          placeholder="자재명"
                          value={entry.name || ''}
                          onChange={(e) => {
                            const updated = [...editingReport.material_entries];
                            updated[idx].name = e.target.value;
                            setEditingReport({ ...editingReport, material_entries: updated });
                          }}
                          className="sm:w-1/4 border rounded p-1.5 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="규격"
                          value={entry.spec || ''}
                          onChange={(e) => {
                            const updated = [...editingReport.material_entries];
                            updated[idx].spec = e.target.value;
                            setEditingReport({ ...editingReport, material_entries: updated });
                          }}
                          className="sm:w-1/4 border rounded p-1.5 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="수량"
                          value={entry.count || ''}
                          onChange={(e) => {
                            const updated = [...editingReport.material_entries];
                            updated[idx].count = e.target.value;
                            setEditingReport({ ...editingReport, material_entries: updated });
                          }}
                          className="w-20 border rounded p-1.5 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="자재 단가(원)"
                          value={entry.price || ''}
                          onChange={(e) => {
                            const updated = [...editingReport.material_entries];
                            updated[idx].price = e.target.value;
                            setEditingReport({ ...editingReport, material_entries: updated });
                          }}
                          className="sm:w-1/4 border rounded p-1.5 text-sm bg-blue-50 font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingReport.material_entries.filter((_: any, i: number) => i !== idx);
                            setEditingReport({ ...editingReport, material_entries: updated });
                          }}
                          className="text-red-500 font-bold px-2 text-sm self-end sm:self-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow text-base"
                >
                  {isSubmitting ? '수정 사항 저장 중...' : '💾 단가 및 수정사항 저장하기'}
                </button>
              </form>
            </div>
          )}

          {/* 📊 전체집계 및 엑셀 다운로드 */}
          {activeTab === 'summary' && (
            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold">📊 현장별/일자별 금액 전체 집계</h2>
                <button
                  onClick={exportToCSV}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded text-sm shadow flex items-center gap-1"
                >
                  📥 엑셀(CSV) 다운로드
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left text-slate-600 border">
                  <thead className="bg-slate-100 uppercase">
                    <tr>
                      <th className="p-2 border">일자</th>
                      <th className="p-2 border">현장명</th>
                      <th className="p-2 border">작성자</th>
                      <th className="p-2 border text-center">총 인원</th>
                      <th className="p-2 border text-right">노무비</th>
                      <th className="p-2 border text-right">장비비</th>
                      <th className="p-2 border text-right">자재비</th>
                      <th className="p-2 border text-right font-bold text-emerald-800">합계 금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report, idx) => {
                      const workersList = report.worker_entries || report.work_entries || [];
                      const totalWorkers = workersList.reduce(
                        (acc: number, cur: any) => acc + (parseInt(cur.count) || 0),
                        0
                      );
                      const laborCost = workersList.reduce(
                        (acc: number, cur: any) => acc + (parseInt(cur.price) || 0) * (parseInt(cur.count) || 1),
                        0
                      );
                      const eqCost = (report.equipment_entries || []).reduce(
                        (acc: number, cur: any) => acc + (parseInt(cur.price) || 0),
                        0
                      );
                      const matCost = (report.material_entries || []).reduce(
                        (acc: number, cur: any) => acc + (parseInt(cur.price) || 0) * (parseInt(cur.count) || 1),
                        0
                      );
                      const grandTotal = laborCost + eqCost + matCost;

                      return (
                        <tr key={idx} className="border-b hover:bg-slate-50">
                          <td className="p-2 border">{report.work_date}</td>
                          <td className="p-2 border font-bold">{report.site_name}</td>
                          <td className="p-2 border">{report.writer}</td>
                          <td className="p-2 border text-center">{totalWorkers} 명</td>
                          <td className="p-2 border text-right">{laborCost.toLocaleString()} 원</td>
                          <td className="p-2 border text-right">{eqCost.toLocaleString()} 원</td>
                          <td className="p-2 border text-right">{matCost.toLocaleString()} 원</td>
                          <td className="p-2 border text-right font-bold text-emerald-700 bg-emerald-50">
                            {grandTotal.toLocaleString()} 원
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 🖨️ 출력용 A4 양식 */}
          {activeTab === 'print' && (
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow">
              <div className="flex justify-between items-center mb-4 no-print">
                <h2 className="font-bold text-lg">🖨️ A4 출력을 위한 미리보기</h2>
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white px-4 py-2 rounded font-bold"
                >
                  인쇄하기 / PDF 저장
                </button>
              </div>

              {selectedReport ? (
                <div className="border-2 border-black p-6 font-serif">
                  <h1 className="text-2xl font-bold text-center border-b-2 border-black pb-2 mb-4">
                    작 업 일 보
                  </h1>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div><strong>공사명/현장명:</strong> {selectedReport.site_name}</div>
                    <div><strong>작성일자:</strong> {selectedReport.work_date}</div>
                    <div><strong>작 성 자:</strong> {selectedReport.writer}</div>
                    <div><strong>날 씨:</strong> {selectedReport.weather}</div>
                  </div>

                  {/* 1. 주요 작업내용 */}
                  <h3 className="font-bold border-b mb-1 text-sm">1. 주요 작업내용</h3>
                  <table className="w-full text-xs border-collapse border border-black mb-4">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-1 w-1/3">공종/작업명</th>
                        <th className="border border-black p-1">세부 작업내용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReport.work_entries || []).length > 0 ? (
                        selectedReport.work_entries.map((w: any, i: number) => (
                          <tr key={i}>
                            <td className="border border-black p-1 text-center">{w.processName || '-'}</td>
                            <td className="border border-black p-1">{w.detail || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={2} className="border border-black p-1 text-center">-</td></tr>
                      )}
                    </tbody>
                  </table>

                  {/* 2. 출력인원 명단 */}
                  <h3 className="font-bold border-b mb-1 text-sm">2. 출력인원 명단</h3>
                  <table className="w-full text-xs border-collapse border border-black mb-4">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-1">직종</th>
                        <th className="border border-black p-1">성함(이름)</th>
                        <th className="border border-black p-1">인원(명)</th>
                        <th className="border border-black p-1">단가(원)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReport.worker_entries || selectedReport.work_entries || []).map((w: any, i: number) => (
                        <tr key={i}>
                          <td className="border border-black p-1 text-center">{w.jobType || w.processName || '-'}</td>
                          <td className="border border-black p-1 text-center">{w.name || w.detail || '-'}</td>
                          <td className="border border-black p-1 text-center">{w.count || '1'}</td>
                          <td className="border border-black p-1 text-right">
                            {w.price ? parseInt(w.price).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* 3. 장비 투입 내역 */}
                  <h3 className="font-bold border-b mb-1 text-sm">3. 장비 투입 내역</h3>
                  <table className="w-full text-xs border-collapse border border-black mb-4">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-1">장비명</th>
                        <th className="border border-black p-1">수량/대수</th>
                        <th className="border border-black p-1">비고</th>
                        <th className="border border-black p-1">금액(원)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReport.equipment_entries || []).length > 0 ? (
                        selectedReport.equipment_entries.map((eq: any, i: number) => (
                          <tr key={i}>
                            <td className="border border-black p-1 text-center">{eq.name || '-'}</td>
                            <td className="border border-black p-1 text-center">{eq.count || '-'}</td>
                            <td className="border border-black p-1">{eq.note || '-'}</td>
                            <td className="border border-black p-1 text-right">
                              {eq.price ? parseInt(eq.price).toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} className="border border-black p-1 text-center">장비 투입 내역 없음</td></tr>
                      )}
                    </tbody>
                  </table>

                  {/* 4. 자재 반입 내역 */}
                  <h3 className="font-bold border-b mb-1 text-sm">4. 자재 반입 내역</h3>
                  <table className="w-full text-xs border-collapse border border-black mb-4">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-1">자재명</th>
                        <th className="border border-black p-1">규격</th>
                        <th className="border border-black p-1">수량</th>
                        <th className="border border-black p-1">단가(원)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReport.material_entries || []).length > 0 ? (
                        selectedReport.material_entries.map((m: any, i: number) => (
                          <tr key={i}>
                            <td className="border border-black p-1 text-center">{m.name || '-'}</td>
                            <td className="border border-black p-1 text-center">{m.spec || '-'}</td>
                            <td className="border border-black p-1 text-center">{m.count || '-'}</td>
                            <td className="border border-black p-1 text-right">
                              {m.price ? parseInt(m.price).toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} className="border border-black p-1 text-center">자재 반입 내역 없음</td></tr>
                      )}
                    </tbody>
                  </table>

                  {/* 5. 현장 사진 */}
                  {selectedReport.photo_urls && selectedReport.photo_urls.length > 0 && (
                    <div>
                      <h3 className="font-bold border-b mb-2 text-sm">5. 현장 사진</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedReport.photo_urls.map((url: string, i: number) => (
                          <div key={i} className="border p-1 bg-slate-50 flex justify-center items-center">
                            <img
                              src={url}
                              alt="현장사진"
                              className="w-full h-48 object-contain rounded"
                              crossOrigin="anonymous"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">
                  [관리자 페이지] 탭에서 원하는 일보를 선택해 주세요.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
