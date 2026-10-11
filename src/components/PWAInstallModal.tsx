import React, { useState } from 'react';
import { DevicePlatform } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: DevicePlatform;
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall: () => Promise<boolean>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  platform,
  isInstallable,
  isInstalled,
  onInstall,
}) => {
  const [selectedTab, setSelectedTab] = useState<DevicePlatform>(platform);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await onInstall();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#12141C] border border-[#2A2E3D] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#E2E4E9] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1E2230] flex items-center justify-between bg-[#161924]">
          <div className="flex items-center gap-3">
            <img
              src="/apple-touch-icon.png"
              alt="스윙짐 인바디 아이콘"
              className="w-10 h-10 rounded-xl shadow-md border border-[#3B82F6]/30 object-cover"
            />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>단축 아이콘 등록 (앱 설치)</span>
                {isInstalled && (
                  <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    설치 완료됨
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#94A3B8]">
                홈 화면 또는 바탕화면에 아이콘을 등록해 앱처럼 빠르게 실행하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1F2433] hover:bg-[#2A3145] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors"
            title="닫기"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* 1-Click Install Button if supported */}
        {isInstallable && !isInstalled && (
          <div className="mx-6 mt-5 p-4 rounded-xl bg-gradient-to-r from-[#1D4ED8]/20 via-[#2563EB]/25 to-[#06B6D4]/20 border border-[#3B82F6]/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F6] flex items-center justify-center text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">download</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">원클릭 바로 설치하기</p>
                <p className="text-[11px] text-[#93C5FD]">현재 브라우저에서 바로 홈 화면/PC에 등록합니다</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              disabled={installSuccess}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              {installSuccess ? (
                <>
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>등록 완료!</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">add_to_home_screen</span>
                  <span>지금 바로 설치</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Platform Tabs */}
        <div className="px-6 pt-4 pb-2">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0A0B0E] rounded-xl border border-[#1E2230]">
            <button
              onClick={() => setSelectedTab('desktop')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                selectedTab === 'desktop'
                  ? 'bg-[#3B82F6] text-white shadow'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#161924]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">computer</span>
              <span>PC 크롬</span>
            </button>
            <button
              onClick={() => setSelectedTab('ios')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                selectedTab === 'ios'
                  ? 'bg-[#3B82F6] text-white shadow'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#161924]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
              <span>사파리 (iOS)</span>
            </button>
            <button
              onClick={() => setSelectedTab('android')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                selectedTab === 'android'
                  ? 'bg-[#3B82F6] text-white shadow'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#161924]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">android</span>
              <span>크롬 (안드로이드)</span>
            </button>
          </div>
        </div>

        {/* Tab Content / Detailed Steps */}
        <div className="px-6 py-3 overflow-y-auto space-y-4">
          {/* TAB 1: PC Chrome */}
          {selectedTab === 'desktop' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-[#161924] border border-[#252B3B]">
                <p className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#3B82F6]">laptop_chromebook</span>
                  PC 크롬 브라우저에서 단축아이콘 등록 방법
                </p>
                <p className="text-[11px] text-[#94A3B8]">
                  바탕화면 및 작업표시줄에 앱 바로가기 아이콘을 만들고 독립 창으로 실행할 수 있습니다.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0F1118] border border-[#1E2230]">
                  <div className="w-6 h-6 rounded-full bg-[#3B82F6]/20 text-[#38BDF8] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">방법 A: 주소창 우측 [설치] 버튼 클릭 (가장 쉬움)</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      브라우저 주소창(URL) 맨 우측에 보이는 <span className="text-[#38BDF8] font-bold">[설치 ⊕]</span> 또는 컴퓨터 모니터 모양 아이콘을 클릭합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0F1118] border border-[#1E2230]">
                  <div className="w-6 h-6 rounded-full bg-[#3B82F6]/20 text-[#38BDF8] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">방법 B: 크롬 메뉴 [⋮] 이용하기</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      크롬 우측 상단의 점 세 개 <span className="font-bold text-white">[⋮]</span> 메뉴 클릭 → <span className="text-[#38BDF8] font-bold">[저장 및 공유]</span> 또는 <span className="text-[#38BDF8] font-bold">[전송, 저장 및 공유]</span> → <span className="text-[#38BDF8] font-bold">[스윙짐 인바디 설치]</span> 또는 <span className="text-[#38BDF8] font-bold">[바로가기 만들기]</span>를 누릅니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0F1118] border border-[#1E2230]">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-white">바탕화면 단축 아이콘 생성 완료</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      바탕화면에 <span className="text-white font-semibold">"스윙짐인바디"</span> 아이콘이 생성되어 더블 클릭 시 주소창 없는 전용 앱 창으로 열립니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: iOS Safari */}
          {selectedTab === 'ios' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-[#161924] border border-[#252B3B]">
                <p className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#38BDF8]">apple</span>
                  아이폰/아이패드 사파리(Safari)에서 홈 화면 추가 방법
                </p>
                <p className="text-[11px] text-[#94A3B8]">
                  사파리 웹 브라우저를 열고 2단계만 진행하면 홈 화면에 바로가기 앱 아이콘이 등록됩니다.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0F1118] border border-[#1E2230]">
                  <div className="w-6 h-6 rounded-full bg-[#3B82F6]/20 text-[#38BDF8] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">사파리 하단 [공유] 버튼 터치</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      사파리 브라우저 화면 맨 아래 도구 모음 중앙에 있는 <span className="text-[#38BDF8] font-bold">[공유]</span> 버튼(위쪽 화살표가 있는 네모 상자 아이콘 <span className="material-symbols-outlined text-[13px] inline align-middle">ios_share</span>)을 탭합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0F1118] border border-[#1E2230]">
                  <div className="w-6 h-6 rounded-full bg-[#3B82F6]/20 text-[#38BDF8] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">[홈 화면에 추가] 선택</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      나타나는 공유 시트 메뉴에서 아래로 조금 스크롤하여 <span className="text-[#38BDF8] font-bold">[홈 화면에 추가 ⊞]</span> 항목을 탭합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0F1118] border border-[#1E2230]">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">우측 상단 [추가] 탭</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      이름 <span className="text-white font-semibold">'스윙짐인바디'</span> 확인 후 우측 상단의 <span className="text-[#10B981] font-bold">[추가]</span>를 누르면 아이폰 홈 화면에 선명한 전용 앱 아이콘이 생성됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Android Chrome */}
          {selectedTab === 'android' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-[#161924] border border-[#252B3B]">
                <p className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-400">android</span>
                  갤럭시/안드로이드 크롬(Chrome)에서 홈 화면 추가 방법
                </p>
                <p className="text-[11px] text-[#94A3B8]">
                  모바일 크롬 브라우저에서 홈 화면에 추가하면 스마트폰 바탕에 앱처럼 등록됩니다.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0F1118] border border-[#1E2230]">
                  <div className="w-6 h-6 rounded-full bg-[#3B82F6]/20 text-[#38BDF8] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">크롬 우측 상단 더보기 [⋮] 터치</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      크롬 브라우저 우측 상단에 위치한 세로 점 3개 <span className="font-bold text-white">[⋮]</span> 메뉴 버튼을 탭합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0F1118] border border-[#1E2230]">
                  <div className="w-6 h-6 rounded-full bg-[#3B82F6]/20 text-[#38BDF8] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">[홈 화면에 추가] 또는 [앱 설치] 선택</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      메뉴 목록에서 <span className="text-[#38BDF8] font-bold">[홈 화면에 추가]</span> 또는 <span className="text-[#38BDF8] font-bold">[앱 설치]</span>를 터치합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0F1118] border border-[#1E2230]">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">팝업에서 [설치] 또는 [추가] 터치</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      확인 팝업에서 <span className="text-[#10B981] font-bold">[설치]</span>를 누르면 스마트폰 앱 서랍과 홈 화면에 등록되어 언제든 한 번의 터치로 실행할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Persistence Note */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-2.5 text-[11px] text-blue-300">
            <span className="material-symbols-outlined text-[16px] text-blue-400 flex-shrink-0 mt-0.5">
              verified
            </span>
            <span>
              <strong>기존 데이터 완전 보존:</strong> 단축 아이콘 등록이나 앱 설치 후에도 저장된 모든 회원 정보와 인바디 측정 기록은 그대로 유지됩니다.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1E2230] bg-[#161924] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#252B3B] hover:bg-[#32394D] text-white text-xs font-semibold transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
