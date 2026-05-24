import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import type {
  BarangayInfo,
  Announcement,
  Event,
  Official,
  BarangayService,
} from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "home" | "news" | "events" | "services" | "council"
  >("home");
  const [loading, setLoading] = useState<boolean>(true);

  const [info, setInfo] = useState<BarangayInfo | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [services, setServices] = useState<BarangayService[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);

  useEffect(() => {
    async function loadLiveCitizenData() {
      try {
        setLoading(true);

        // Parallel non-blocking execution across read-only endpoints
        const [infoRes, annRes, evtRes, srvRes, offRes] = await Promise.all([
          supabase.from("barangay_info").select("*").maybeSingle(),
          supabase
            .from("announcements")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("events")
            .select("*")
            .order("event_date", { ascending: true }),
          supabase
            .from("barangay_services")
            .select("*")
            .order("name", { ascending: true }),
          supabase
            .from("officials")
            .select("*")
            .order("created_at", { ascending: true }),
        ]);

        if (infoRes.error)
          console.error("Info Stream Error:", infoRes.error.message);
        if (annRes.error)
          console.error("Announcements Stream Error:", annRes.error.message);
        if (evtRes.error)
          console.error("Events Stream Error:", evtRes.error.message);

        if (infoRes.data) setInfo(infoRes.data);
        if (annRes.data) setAnnouncements(annRes.data);
        if (evtRes.data) setEvents(evtRes.data);
        if (srvRes.data) setServices(srvRes.data);
        if (offRes.data) setOfficials(offRes.data);
      } catch (err) {
        console.error("Citizen site network aggregation failure:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLiveCitizenData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
        <div className="animate-pulse">Connecting to LGU Network Core...</div>
      </div>
    );
  }

  // Fallback structures mapping directly onto actual Legazpi City parameters
  const currentInfo = info || {
    name: "Barangay 17 - Rizal Street (Ilawod)",
    municipality: "Legazpi City",
    province: "Albay",
    contact_number: "(052) 742-1717",
    email: "bgy17.ilawod@legazpi.gov.ph",
    vision:
      "Isang maunlad, mapayapa, at luntian na pamayanan sa lungsod ng Legazpi, na may aktibong mamamayan na nagkakaisa sa ilalim ng tapat at makabagong pamamahala.",
    mission:
      "Ihatid ang mabilis at de-kalidad na serbisyo publiko, panatilihin ang kaayusan sa kahabaan ng Rizal Street, at itaguyod ang kalusugan at kabuhayan ng bawat pamilyang Bicolano.",
  };

  const publicAnnouncements = announcements.filter(
    (a) => !a.status || a.status === "Published",
  );
  const activeEvents = events.filter(
    (e) => !e.status || e.status === "Upcoming" || e.status === "Ongoing",
  );
  const activeOfficials = officials.filter(
    (o) => !o.status || o.status === "Active",
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans select-none antialiased">
      {/* 1. INSTITUTIONAL NAVIGATION BAR: Extends edge-to-edge */}
      <header className="w-full bg-gov-navy text-white shadow-sm z-30 sticky top-0 shrink-0 border-b border-white/5">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-20 flex flex-col md:flex-row md:items-center md:justify-between py-3 md:py-0 gap-2 md:gap-0">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white to-slate-200 text-gov-navy font-black text-sm flex items-center justify-center shadow-md">
              RP
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                  {currentInfo.name}
                </h1>
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                  Live Portal
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium tracking-wide">
                {currentInfo.municipality}, {currentInfo.province}
              </p>
            </div>
          </div>

          {/* DESKTOP LINK MENU */}
          <nav className="hidden md:flex items-center gap-1 h-full text-xs font-bold uppercase tracking-wider">
            {[
              { id: "home", label: "Tahanan (Home)" },
              { id: "news", label: "Mga Anunsyo" },
              { id: "events", label: "Iskedyul" },
              { id: "services", label: "Mga Serbisyo" },
              { id: "council", label: "Konseho" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? "bg-white/10 text-white font-extrabold shadow-inner border-b-2 border-slate-300"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 2. CLAMPED CONTENT SYSTEM: Centered and locked to standard 1280px boundaries */}
      <div className="w-full flex-1 overflow-y-auto bg-slate-50/40 pb-24 md:pb-12">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* TAB 1: HOME PLATFORM OVERVIEW */}
          {activeTab === "home" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start fade-in-view text-xs w-full">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-gradient-to-br from-gov-navy to-gov-blue text-white rounded-2xl p-6 shadow-sm border border-white/5 space-y-4">
                  <div>
                    <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gov-accent">
                      Aming Pananaw (Vision)
                    </h3>
                    <p className="text-xs sm:text-sm italic leading-relaxed mt-2 font-light text-slate-200">
                      "{currentInfo.vision}"
                    </p>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gov-accent">
                      Tungkulin (Mission)
                    </h3>
                    <p className="text-xs sm:text-sm italic leading-relaxed mt-2 font-light text-slate-200">
                      "{currentInfo.mission}"
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-xs space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Mabilisang Aksyon para sa Mamamayan
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab("services")}
                      className="bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/60 rounded-2xl p-5 text-left cursor-pointer transition-all shadow-2xs"
                    >
                      <div className="font-bold text-gov-darkText text-xs">
                        Kumuha ng Dokumentasyon
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1.5 font-medium leading-normal">
                        Gabay sa pagkuha ng Barangay Clearance, Certificates, at
                        Permits.
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("news")}
                      className="bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/60 rounded-2xl p-5 text-left cursor-pointer transition-all shadow-2xs"
                    >
                      <div className="font-bold text-gov-darkText text-xs">
                        Tingnan ang mga Anunsyo
                      </div>
                      <div className="text-[11px] text-gov-blue font-bold mt-1.5 font-mono">
                        {publicAnnouncements.length} Aktibong Balita at Babala
                        sa Rizal St.
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Widgets */}
              <div className="space-y-4">
                <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-5 space-y-2.5">
                  <span className="text-[9px] font-extrabold text-rose-800 uppercase tracking-widest block">
                    Emergency Desk Hotline
                  </span>
                  <div className="text-base font-mono font-black text-rose-700">
                    {currentInfo.contact_number ||
                      (currentInfo as any).contactNumber}
                  </div>
                  <div className="text-[11px] text-rose-600 font-medium truncate">
                    {currentInfo.email}
                  </div>
                </div>

                <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 text-slate-500 text-[11px] space-y-2 leading-relaxed font-medium">
                  <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    Lokasyon ng Tanggapan
                  </h4>
                  <p>
                    Rizal Street, Ilawod (Poblacion), Lungsod ng Legazpi, Albay,
                    Bicol Region.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MGA ANUNSYO (CLAMPED WIDTH FOR BULLETINS) */}
          {activeTab === "news" && (
            <div className="space-y-6 max-w-4xl mx-auto fade-in-view text-xs font-medium">
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gov-darkText">
                  Mga Kasalukuyang Anunsyo
                </h3>
                <p className="text-slate-400 text-[11px] font-normal mt-0.5">
                  Opisyal na balita, babala, at paunawa para sa mga residente.
                </p>
              </div>

              {publicAnnouncements.length === 0 ? (
                <p className="text-center py-16 text-slate-400 font-semibold">
                  Walang aktibong anunsyo sa kasalukuyan.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {publicAnnouncements.map((ann) => (
                    <div
                      key={ann.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-2xs space-y-3"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="text-sm font-black text-gov-navy leading-snug">
                          {ann.title}
                        </h4>
                        {ann.priority === "High" && (
                          <span className="bg-rose-50 text-rose-700 font-extrabold text-[8px] px-2.5 py-1 rounded-md border border-rose-100 uppercase tracking-wider shrink-0">
                            Urgent Advisory
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium text-[12px] max-w-3xl">
                        {ann.content}
                      </p>
                      <div className="text-[9px] text-slate-400 font-mono pt-2 border-t border-slate-100 font-semibold">
                        Petsa ng Pagpapahayag:{" "}
                        {ann.date_published || (ann as any).datePublished}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ISKEDYUL AT PROGRAMA (3-COLUMN DESKTOP DASHBOARD GRID) */}
          {activeTab === "events" && (
            <div className="space-y-6 fade-in-view text-xs font-medium">
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gov-darkText">
                  Iskedyul at Programa
                </h3>
                <p className="text-slate-400 text-[11px] font-normal mt-0.5">
                  Calendar ng mga aktibidad at pampublikong pagtitipon sa
                  barangay.
                </p>
              </div>

              {activeEvents.length === 0 ? (
                <p className="text-center py-16 text-slate-400">
                  Walang nakaiskedyul na kaganapan.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200/80 border-l-4 border-l-gov-blue shadow-sm flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-gov-darkText leading-tight">
                          {evt.title}
                        </h4>
                        {evt.description && (
                          <p className="text-slate-500 leading-relaxed text-[11px] line-clamp-4 font-normal">
                            {evt.description}
                          </p>
                        )}
                      </div>
                      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 space-y-1.5 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 uppercase text-[9px] w-10 shrink-0">
                            Kailan:
                          </span>
                          <span className="text-slate-700 font-bold font-mono bg-slate-50 px-2 py-0.5 rounded border">
                            {evt.event_date || (evt as any).eventDate}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-slate-400 uppercase text-[9px] w-10 shrink-0">
                            Saan:
                          </span>
                          <span className="text-gov-navy font-bold truncate">
                            {evt.venue}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MGA SERBISYO (2-COLUMN BALANCED MATRIX GRID) */}
          {activeTab === "services" && (
            <div className="space-y-6 fade-in-view text-xs">
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gov-darkText">
                  Civil Clearances Matrix
                </h3>
                <p className="text-slate-400 text-[11px] font-normal mt-0.5">
                  Proseso at mga kinakailangan para sa pagkuha ng opisyal na
                  dokumento.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-gov-darkText leading-tight">
                        {srv.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                        {srv.description}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 bg-slate-50 rounded-xl p-3 text-[10px] text-slate-500 border border-slate-100 font-medium">
                        <div>
                          Bayad:{" "}
                          <span className="font-bold text-gov-blue block text-xs mt-0.5">
                            {srv.fees}
                          </span>
                        </div>
                        <div>
                          Pagproseso:{" "}
                          <span className="font-bold text-slate-700 block text-xs font-mono mt-0.5">
                            {srv.processing_time || (srv as any).processingTime}
                          </span>
                        </div>
                      </div>
                      {srv.requirements?.length > 0 && (
                        <div className="text-[11px] text-slate-500 space-y-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                            Mga Kakailanganin:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 font-medium">
                            {srv.requirements.map((r, i) => (
                              <li key={i} className="truncate">
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: COUNCIL REGISTER (3-COLUMN ALIGNED ROSTER BLOCK) */}
          {activeTab === "council" && (
            <div className="space-y-6 max-w-6xl mx-auto fade-in-view text-xs font-medium">
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gov-darkText">
                  Sangguniang Barangay Directory
                </h3>
                <p className="text-slate-400 text-[11px] font-normal mt-0.5">
                  Mga kasalukuyang hinalal na opisyal na naglilingkod sa ating
                  pamayanan.
                </p>
              </div>

              {activeOfficials.length === 0 ? (
                <p className="text-center py-16 text-slate-400">
                  Walang nakatalagang opisyal sa system directory.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeOfficials.map((off) => (
                    <div
                      key={off.id}
                      className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-3 hover:border-gov-blue/40 transition-colors"
                    >
                      <div>
                        <div className="font-black text-gov-darkText text-sm tracking-tight">
                          {off.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1 font-semibold">
                          Term: {off.term_start || (off as any).termStart} -{" "}
                          {off.term_end || (off as any).termEnd}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Katungkulan:
                        </span>
                        <span className="text-[11px] bg-slate-50 text-gov-blue border border-slate-100 font-extrabold px-3 py-1 rounded-xl">
                          {off.position}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* 3. MOBILE SYSTEM BOTTOM NAVIGATION: Hidden on PC views */}
      <nav className="md:hidden bg-white border-t border-slate-200/80 h-16 flex flex-row items-center justify-between px-1 fixed bottom-0 inset-x-0 z-40 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
        {[
          { id: "home", label: "Home" },
          { id: "news", label: "Balita" },
          { id: "events", label: "Schedules" },
          { id: "services", label: "Serbisyo" },
          { id: "council", label: "Konseho" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ width: "20%" }}
              className={`flex flex-col items-center justify-center h-full text-[9px] uppercase tracking-wider cursor-pointer border-none bg-transparent shrink-0 outline-none transition-all duration-150 ${
                isActive
                  ? "text-gov-blue font-black scale-102 bg-slate-50/60"
                  : "text-slate-400 font-bold hover:text-slate-600"
              }`}
            >
              <span className="block truncate text-center w-full px-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
