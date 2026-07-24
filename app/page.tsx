'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function WorkLogPage() {
  const [activeTab, setActiveTab] = useState<'form' | 'admin' | 'print' | 'summary'>('form');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // 일보 데이터 상태
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [writer, setWriter] = useState('');
  const [siteName, setSiteName] = useState('');
  const [weather, setWeather] = useState('맑음');

  // 작업내용 & 인원
  const [workEntries, setWorkEntries] = useState([
    { processName: '', detail: '', count: '' }
  ]);

  // 장비 사용 내역
  const [equipmentEntries, setEquipmentEntries] = useState([
    { name: '', count: '', note: '' }
  ]);

  // 자재 반입 내역
  const [materialEntries, setMaterialEntries] = useState([
    { name: '', spec: '', count: '', unit: '' }
  ]);

  // 사진 업로드
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // 제출 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 저장된 일보 목록
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // 비밀번호 확인 핸들러
  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '1234') { // 기본 비밀번호 1234
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

  // 사진 첨부 처리
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPhotoFiles(prev => [...prev, ...filesArray]);

      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  // 작업 항목 추가/삭제
  const addWorkEntry = () => setWorkEntries([...workEntries, { processName: '', detail: '', count: '' }]);
  const removeWorkEntry = (idx: number) => setWorkEntries(workEntries.filter((_, i) => i !== idx));

  // 장비 항목 추가/삭제
  const addEquipmentEntry = () => setEquipmentEntries([...equipmentEntries, { name: '', count: '', note: '' }]);
  const removeEquipmentEntry = (idx: number) => setEquipmentEntries(equipmentEntries.filter((_, i) => i !== idx));

  // 자재 항목 추가/삭제
  const addMaterialEntry = () => setMaterialEntries([...materialEntries, { name: '', spec: '', count: '', unit: '' }]);
  const removeMaterialEntry = (idx: number) => setMaterialEntries(materialEntries.filter((_, i) => i !== idx));

  // 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !writer) {
      alert('현장명과 작성자는 필수 입력 항목입니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 사진 업로드
      const uploadedPhotoUrls: string[] = [];
      for (const file of photoFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { data, error } = await supabase.storage.from('work-photos').upload(fileName, file);

        if (!error && data) {
          const { data: publicData } = supabase.storage.from('work-photos').getPublicUrl(fileName);
          uploadedPhotoUrls.push(publicData.publicUrl);
        }
      }

      // 2. DB 저장
      const { error } = await supabase.from('work_logs').insert([
        {
          work_date: workDate,
          writer,
          site_name: siteName,
          weather,
          work_entries: workEntries,
          equipment_entries: equipmentEntries,
          material_entries: materialEntries,
          photo_urls: uploadedPhotoUrls,
        },
      ]);

      if (error) throw error;

      alert('작업일보가 성공적으로 제출되었습니다!');
      // 폼 초기화
      setWriter('');
      setSiteName('');
      setWorkEntries([{ processName: '', detail: '', count: '' }]);
      setEquipmentEntries([{ name: '', count: '', note: '' }]);
      setMaterialEntries([{ name: '', spec: '', count: '', unit: '' }]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
    } catch (err: any) {
      alert('제출 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSubmitting(false);
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
            activeTab === 'admin' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 (모바일 대응 레이아웃: flex-col sm:flex-row) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">작성일자</label>
                <input
                  type="date"
                  value={workDate}
                  onChange={e => setWorkDate(e.target.value)}
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
                  onChange={e => setWriter(e.target.value)}
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
                  onChange={e => setSiteName(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">날씨</label>
                <select
                  value={weather}
                  onChange={e => setWeather(e.target.value)}
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

            {/* 작업내용 및 인원 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-700">👷 작업내용 및 인원</h3>
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
                    onChange={e => {
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
                    onChange={e => {
                      const updated = [...workEntries];
                      updated[idx].detail = e.target.value;
                      setWorkEntries(updated);
                    }}
                    className="sm:w-1/2 border rounded p-1.5 text-sm"
                  />
                  <div className="flex gap-1 items-center">
                    <input
                      type="number"
                      placeholder="인원"
                      value={entry.count}
                      onChange={e => {
                        const updated = [...workEntries];
                        updated[idx].count = e.target.value;
                        setWorkEntries(updated);
                      }}
                      className="w-20 border rounded p-1.5 text-sm"
                    />
                    <span className="text-xs text-slate-500">명</span>
                    {workEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWorkEntry(idx)}
                        className="text-red-500 font-bold px-2 text-sm"
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
                    onChange={e => {
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
                    onChange={e => {
                      const updated = [...equipmentEntries];
                      updated[idx].count = e.target.value;
                      setEquipmentEntries(updated);
                    }}
                    className="sm:w-1/4 border rounded p-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="비고/작업내용"
                    value={entry.note}
                    onChange={e => {
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

            {/* 사진 첨부 */}
            <div>
              <h3 className="font-bold text-slate-700 mb-2">📷 현장 사진 첨부</h3>
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
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow transition duration-200 text-base"
            >
              {isSubmitting ? '제출 중...' : '작업일보 제출하기'}
            </button>
          </form>
        </div>
      )}

      {/* 2. 관리자 인증 / 관리자 페이지 & 전체집계 공통 처리 */}
      {(activeTab === 'admin' || activeTab === 'summary' || activeTab === 'print') && !isAdminAuthenticated && (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6 text-center mt-10">
          <h2 className="text-xl font-bold mb-4 text-slate-800">🔒 관리자 인증이 필요합니다</h2>
          <form onSubmit={handleAdminAuth} className="space-y-4">
            <input
              type="password"
              placeholder="비밀번호 입력 (기본: 1234)"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
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

      {/* 관리자 인증 성공 후 보여줄 내용들 */}
      {isAdminAuthenticated && (
        <>
          {/* 관리자 목록 보기 */}
          {activeTab === 'admin' && (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">📋 제출된 작업일보 목록</h2>
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">저장된 작업일보가 없습니다.</p>
                ) : (
                  reports.map(report => (
                    <div
                      key={report.id}
                      className="border rounded p-4 flex justify-between items-center bg-slate-50 hover:bg-emerald-50 cursor-pointer"
                      onClick={() => {
                        setSelectedReport(report);
                        setActiveTab('print');
                      }}
                    >
                      <div>
                        <div className="font-bold text-slate-800">{report.site_name}</div>
                        <div className="text-xs text-slate-500">
                          {report.work_date} | 작성자: {report.writer} | 날씨: {report.weather}
                        </div>
                      </div>
                      <span className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded">A4 보기</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 전체집계 (관리자 전용) */}
          {activeTab === 'summary' && (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">📊 현장별/일자별 전체 집계</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 border">
                  <thead className="bg-slate-100 uppercase text-xs">
                    <tr>
                      <th className="p-2 border">일자</th>
                      <th className="p-2 border">현장명</th>
                      <th className="p-2 border">작성자</th>
                      <th className="p-2 border">총 투입인원</th>
                      <th className="p-2 border">투입 장비</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report, idx) => {
                      const totalWorkers = (report.work_entries || []).reduce(
                        (acc: number, cur: any) => acc + (parseInt(cur.count) || 0),
                        0
                      );
                      const eqList = (report.equipment_entries || [])
                        .map((e: any) => `${e.name}(${e.count})`)
                        .join(', ');

                      return (
                        <tr key={idx} className="border-b">
                          <td className="p-2 border">{report.work_date}</td>
                          <td className="p-2 border font-bold">{report.site_name}</td>
                          <td className="p-2 border">{report.writer}</td>
                          <td className="p-2 border text-emerald-700 font-bold">{totalWorkers} 명</td>
                          <td className="p-2 border text-xs">{eqList || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 출력용 A4 양식 */}
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

                  <h3 className="font-bold border-b mb-2">1. 작업내용 및 인원</h3>
                  <table className="w-full text-xs border-collapse border border-black mb-4">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-1">공종</th>
                        <th className="border border-black p-1">세부작업내용</th>
                        <th className="border border-black p-1">인원(명)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReport.work_entries || []).map((w: any, i: number) => (
                        <tr key={i}>
                          <td className="border border-black p-1">{w.processName}</td>
                          <td className="border border-black p-1">{w.detail}</td>
                          <td className="border border-black p-1 text-center">{w.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {selectedReport.photo_urls && selectedReport.photo_urls.length > 0 && (
                    <div>
                      <h3 className="font-bold border-b mb-2">2. 현장 사진</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedReport.photo_urls.map((url: string, i: number) => (
                          <img key={i} src={url} alt="현장사진" className="w-full h-40 object-cover border" />
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
