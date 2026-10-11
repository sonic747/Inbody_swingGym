import React, { useState, useEffect } from 'react';
import { UserProfile, UserAccount, InBodyRecord } from '../types';

interface SettingsViewProps {
  userProfile: UserProfile;
  currentUser?: UserAccount | null;
  accounts?: UserAccount[];
  onUpdateProfile: (profile: UserProfile) => void;
  onNavigateToAdminMembers?: () => void;
  onLogout?: () => void;
  onResetData: () => void;
  totalRecordsCount: number;
  onRestoreBackup?: (backupData: { accounts: UserAccount[]; recordsByUser: Record<string, InBodyRecord[]> }) => void;
  getUserRecords?: (userId: string) => InBodyRecord[];
  onOpenInstallModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  currentUser,
  accounts = [],
  onUpdateProfile,
  onNavigateToAdminMembers,
  onLogout,
  onResetData,
  totalRecordsCount,
  onRestoreBackup,
  getUserRecords,
  onOpenInstallModal,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [name, setName] = useState(userProfile.name);
  const [age, setAge] = useState(String(userProfile.age ?? ''));
  const [gender, setGender] = useState<'male' | 'female'>(userProfile.gender);
  const [height, setHeight] = useState(String(userProfile.height ?? ''));
  const [targetWeight, setTargetWeight] = useState(String(userProfile.targetWeight ?? ''));
  const [targetBodyFatPercentage, setTargetBodyFatPercentage] = useState(
    String(userProfile.targetBodyFatPercentage ?? '')
  );
  const [savedToast, setSavedToast] = useState(false);

  // Backup & Restore states
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccessInfo, setRestoreSuccessInfo] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(userProfile.name);
    setAge(String(userProfile.age ?? ''));
    setGender(userProfile.gender);
    setHeight(String(userProfile.height ?? ''));
    setTargetWeight(String(userProfile.targetWeight ?? ''));
    setTargetBodyFatPercentage(String(userProfile.targetBodyFatPercentage ?? ''));
  }, [userProfile]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name,
      age: age ? Number(age) : userProfile.age,
      gender,
      height: height ? Number(height) : userProfile.height,
      targetWeight: targetWeight ? Number(targetWeight) : userProfile.targetWeight,
      targetBodyFatPercentage: targetBodyFatPercentage ? Number(targetBodyFatPercentage) : userProfile.targetBodyFatPercentage,
      avatarUrl: userProfile.avatarUrl,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    try {
      const recordsByUser: Record<string, InBodyRecord[]> = {};
      accounts.forEach((acc) => {
        recordsByUser[acc.id] = getUserRecords ? getUserRecords(acc.id) : [];
      });

      const backupPayload = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        appName: 'SwingGym InBody Analyzer',
        totalAccounts: accounts.length,
        accounts,
        recordsByUser,
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `inbody_swinggym_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToastMessage('✅ 전체 회원 및 인바디 데이터가 JSON 파일로 다운로드되었습니다.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e) {
      console.error('Backup export failed:', e);
      setToastMessage('❌ 백업 파일 생성 중 오류가 발생했습니다.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Import / Restore JSON Backup
  const handleImportFile = (file: File) => {
    setRestoreError(null);
    setRestoreSuccessInfo(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setRestoreError('파일 내용이 비어 있습니다.');
          return;
        }

        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          setRestoreError('유효하지 않은 JSON 파일 형식입니다.');
          return;
        }

        if (!Array.isArray(parsed.accounts) || !parsed.recordsByUser || typeof parsed.recordsByUser !== 'object') {
          setRestoreError('올바른 인바디 백업 파일 형식이 아닙니다 (accounts 또는 recordsByUser 누락).');
          return;
        }

        const importedAccounts: UserAccount[] = parsed.accounts;
        const importedRecords: Record<string, InBodyRecord[]> = parsed.recordsByUser;

        if (onRestoreBackup) {
          onRestoreBackup({
            accounts: importedAccounts,
            recordsByUser: importedRecords,
          });
        }

        let totalRecs = 0;
        Object.values(importedRecords).forEach((list) => {
          if (Array.isArray(list)) totalRecs += list.length;
        });

        setRestoreSuccessInfo(
          `성공적으로 복원되었습니다! (회원 ${importedAccounts.length}명, 측정 데이터 ${totalRecs}건)`
        );
        setToastMessage(`✅ 백업 데이터 복원 완료! (회원 ${importedAccounts.length}명)`);
        setTimeout(() => setToastMessage(null), 3500);
      } catch (err: any) {
        console.error('Failed to parse backup JSON:', err);
        setRestoreError(`파일 복원 오류: ${err.message || 'JSON 파싱 실패'}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#E2E4E9]">
          {isAdmin ? '센터 관리자 설정' : '개인 프로필 및 목표 설정'}
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-0.5">
          {isAdmin
            ? '센터 관리자 계정 상태 및 회원 관리 정책을 확인하세요.'
            : '신체 기본 정보와 목표치를 설정하여 정확한 인바디 분석을 받아보세요.'}
        </p>
      </div>

      {savedToast && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs sm:text-sm font-semibold">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>프로필 및 목표 정보가 안전하게 저장되었습니다.</span>
        </div>
      )}

      {toastMessage && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center gap-3 text-blue-400 text-xs sm:text-sm font-semibold animate-in fade-in">
          <span className="material-symbols-outlined text-[20px]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Account Info Card */}
      {currentUser && (
        <div className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                  isAdmin
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {isAdmin ? (
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                ) : (
                  currentUser.name.slice(0, 1)
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{currentUser.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isAdmin ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {isAdmin ? '최고 관리자' : '일반 회원'}
                  </span>
                </div>
                <p className="text-xs text-[#9CA3AF]">아이디: @{currentUser.username}</p>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 bg-[#1A1D27] hover:bg-red-500/10 text-[#9CA3AF] hover:text-red-400 border border-[#2A2D35] hover:border-red-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                로그아웃
              </button>
            )}
          </div>

          <p className="text-xs text-[#6B7280] pt-1">
            {isAdmin
              ? `총 ${accounts.filter((a) => a.role !== 'admin').length}명의 회원 데이터를 통합 관리 중입니다.`
              : '본인 고유 계정으로 로그인되어 타 회원의 데이터와 철저히 분리됩니다.'}
          </p>

          {isAdmin && onNavigateToAdminMembers && (
            <button
              type="button"
              onClick={onNavigateToAdminMembers}
              className="w-full mt-2 py-2.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">groups</span>
              전체 회원 목록 및 대리 스캔 센터 바로가기
            </button>
          )}
        </div>
      )}

      {/* Profile Form */}
      <form
        onSubmit={handleSave}
        className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 shadow-sm space-y-4"
      >
        <h3 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#60A5FA]">person</span>
          기본 신체 프로필 설정
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#9CA3AF] font-medium">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs sm:text-sm text-white placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#9CA3AF] font-medium">성별</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  gender === 'male'
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-[#0D0F16] text-[#9CA3AF] border-[#2A2D35] hover:border-[#3B82F6]'
                }`}
              >
                남성
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  gender === 'female'
                    ? 'bg-[#EC4899] text-white border-[#EC4899]'
                    : 'bg-[#0D0F16] text-[#9CA3AF] border-[#2A2D35] hover:border-[#EC4899]'
                }`}
              >
                여성
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#9CA3AF] font-medium">나이 (세)</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="예: 28"
              className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs sm:text-sm text-white placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#9CA3AF] font-medium">신장 / 키 (cm)</label>
            <input
              type="number"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="예: 178.0"
              className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs sm:text-sm text-white placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
              required
            />
          </div>
        </div>

        <h3 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-2 pt-4 border-t border-[#2A2D35]">
          <span className="material-symbols-outlined text-[#34D399]">track_changes</span>
          목표 인바디 수치
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#9CA3AF] font-medium">목표 체중 (kg)</label>
            <input
              type="number"
              step="0.1"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder="예: 72.0"
              className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs sm:text-sm text-[#60A5FA] font-bold placeholder-[#6B7280] focus:border-[#60A5FA] outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#9CA3AF] font-medium">목표 체지방률 (%)</label>
            <input
              type="number"
              step="0.1"
              value={targetBodyFatPercentage}
              onChange={(e) => setTargetBodyFatPercentage(e.target.value)}
              placeholder="예: 18.0"
              className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs sm:text-sm text-[#34D399] font-bold placeholder-[#6B7280] focus:border-[#34D399] outline-none"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-4"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          프로필 및 목표치 저장
        </button>
      </form>

      {/* PWA & Home Screen Shortcut Icons Section */}
      <div className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#2A2D35] pb-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/apple-touch-icon.png"
              alt="스윙짐 아이콘"
              className="w-7 h-7 rounded-lg border border-[#3B82F6]/40 object-cover shadow-sm"
            />
            <h3 className="font-bold text-sm text-[#E2E4E9]">
              단축 아이콘 등록 및 앱 설치 (PWA)
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            PC / 스마트폰 지원
          </span>
        </div>

        <p className="text-xs text-[#9CA3AF] leading-relaxed">
          스마트폰(아이폰 사파리, 안드로이드 크롬) 및 PC 크롬 바탕화면에 스윙짐 인바디 바로가기 아이콘을 추가하여, 브라우저 주소 입력 없이 1초 만에 앱으로 바로 실행할 수 있습니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 bg-[#161922] border border-[#2A2D35] rounded-xl flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#3B82F6] text-[20px]">laptop_chromebook</span>
            <div>
              <p className="font-bold text-white text-[11px]">PC 크롬</p>
              <p className="text-[10px] text-[#9CA3AF]">바탕화면 바로가기</p>
            </div>
          </div>
          <div className="p-3 bg-[#161922] border border-[#2A2D35] rounded-xl flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#38BDF8] text-[20px]">apple</span>
            <div>
              <p className="font-bold text-white text-[11px]">사파리 (iOS)</p>
              <p className="text-[10px] text-[#9CA3AF]">홈 화면에 추가</p>
            </div>
          </div>
          <div className="p-3 bg-[#161922] border border-[#2A2D35] rounded-xl flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">android</span>
            <div>
              <p className="font-bold text-white text-[11px]">크롬 (안드로이드)</p>
              <p className="text-[10px] text-[#9CA3AF]">홈 화면 앱 설치</p>
            </div>
          </div>
        </div>

        {onOpenInstallModal && (
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[18px]">add_to_home_screen</span>
            <span>기기별 단축 아이콘 등록 방법 보기 / 바로 설치</span>
          </button>
        )}
      </div>

      {/* App Data Management */}
      <div className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#2A2D35] pb-3">
          <h3 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#60A5FA]">database</span>
            인바디 데이터 관리
          </h3>
          {isAdmin && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              백업 및 복원 활성화
            </span>
          )}
        </div>

        {/* Current Target Stats Overview */}
        <div className="flex justify-between items-center text-xs p-3.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl">
          <span className="text-[#9CA3AF]">
            {isAdmin ? '현재 모니터링 대상 저장 기록' : `${userProfile.name} 님의 저장된 인바디 기록`}
          </span>
          <span className="font-bold text-[#60A5FA] text-sm">{totalRecordsCount} 건</span>
        </div>

        {/* Admin Full Backup & Restore Section */}
        {isAdmin && (
          <div className="space-y-4 pt-1">
            <div className="text-xs text-[#9CA3AF]">
              서버 장애나 데이터 유실에 대비하여 전체 회원 계정과 모든 인바디 측정 기록을 파일로 백업하고 즉시 복원할 수 있습니다.
            </div>

            {/* 1. Download Backup (.json) */}
            <div className="p-4 bg-[#161922] border border-emerald-500/30 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <h4 className="text-xs font-bold text-white">1. 데이터 파일로 백업 (다운로드)</h4>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                  .JSON
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                전체 회원 계정, 프로필 및 모든 인바디 측정 내역을 안전한 JSON 단일 파일로 다운로드합니다.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>전체 데이터 백업 파일 다운로드 (.json)</span>
              </button>
            </div>

            {/* 2. Upload & Restore Backup (.json) */}
            <div className="p-4 bg-[#161922] border border-blue-500/30 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <h4 className="text-xs font-bold text-white">2. 백업 파일 업로드로 복원</h4>
                </div>
                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-mono">
                  복원
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                이전에 다운로드해둔 백업 JSON 파일을 업로드하면 회원 목록과 측정 기록이 즉시 복원됩니다.
              </p>

              <label className="border-2 border-dashed border-[#2A2D35] hover:border-[#3B82F6] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#0D0F16] group">
                <span className="material-symbols-outlined text-2xl text-[#6B7280] group-hover:text-[#60A5FA] mb-1 transition-colors">
                  upload_file
                </span>
                <span className="text-xs font-semibold text-[#E2E4E9] group-hover:text-white">
                  백업 파일 선택 또는 여기에 드래그
                </span>
                <span className="text-[10px] text-[#6B7280] mt-0.5">
                  inbody_swinggym_backup_*.json 파일 선택
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportFile(file);
                    }
                    e.target.value = '';
                  }}
                />
              </label>

              {restoreError && (
                <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-red-400">error</span>
                  <span>{restoreError}</span>
                </div>
              )}

              {restoreSuccessInfo && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
                  <span>{restoreSuccessInfo}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reset Data Button */}
        <div className="pt-2 border-t border-[#2A2D35]">
          <button
            type="button"
            onClick={() => {
              if (confirm('현재 회원의 인바디 측정 데이터를 초기화하시겠습니까?')) {
                onResetData();
              }
            }}
            className="w-full py-2.5 px-4 bg-[#161822] hover:bg-red-500/10 text-[#F87171] border border-[#2A2D35] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            현재 대상 데이터 초기화
          </button>
        </div>
      </div>
    </div>
  );
};
