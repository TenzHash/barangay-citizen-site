import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import type {
  BarangayInfo,
  Announcement,
  Event as BarangayEvent,
  Official,
  BarangayService,
} from "./types";

// Explicit custom interface for the experimental PWA installation banner tracking to keep ESLint green
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Strict mapping for allowed menu navigation keys
type TabId = "home" | "news" | "events" | "services" | "council";

interface TabItem {
  id: TabId;
  label: string;
}

export default function App() {
  // PWA Installation Engine States
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Core Layout Navigation States
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [loading, setLoading] = useState<boolean>(true);

  // Document Request Form Modal States
  const [selectedService, setSelectedService] =
    useState<BarangayService | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);

  // Core Public-Facing State Context Objects
  const [info, setInfo] = useState<BarangayInfo>({
    id: "",
    name: "Barangay 17 - Rizal Street (Ilawod)",
    municipality: "Legazpi City",
    province: "Albay",
    contact_number: "",
    email: "",
    vision: "",
    mission: "",
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<BarangayEvent[]>([]);
  const [services, setServices] = useState<BarangayService[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);

  // 1. Capture PWA Browser System Prompts
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  // 2. Real-Time Public Content Fetch Loop
  useEffect(() => {
    async function loadLiveCitizenData() {
      try {
        setLoading(true);

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

        if (infoRes.data) setInfo(infoRes.data);
        if (annRes.data) setAnnouncements(annRes.data);
        if (evtRes.data) setEvents(evtRes.data);
        if (srvRes.data) setServices(srvRes.data);
        if (offRes.data) setOfficials(offRes.data);
      } catch (err) {
        console.error("Citizen site data stream fetch failure:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLiveCitizenData();
  }, []);

  // 3. Document Clearance Entry Creation Handler
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    try {
      setSubmittingRequest(true);

      const { error } = await supabase.from("document_requests").insert([
        {
          service_id: selectedService.id,
          resident_first_name: firstName.trim(),
          resident_last_name: lastName.trim(),
          contact_number: contactNumber.trim(),
          purpose: purpose.trim(),
          status: "Pending",
        },
      ]);

      if (error) throw error;

      alert(
        "Ang inyong hiling ay matagumpay na naipadala! Makakatanggap kayo ng SMS notification kapag handa na ito para sa pickup.",
      );

      // Clear Form Fields on Resolution Success
      setFirstName("");
      setLastName("");
      setContactNumber("");
      setPurpose("");
      setSelectedService(null);
    } catch (err) {
      console.error("Error creating entry row:", err);
      alert("May naganap na kamalian sa pagpapadala. Pakisubukang muli.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleInstallAppClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowInstallBtn(false);
    setDeferredPrompt(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
        <div className="animate-pulse">
          Connecting to Citizen Portal Node...
        </div>
      </div>
    );
  }

  // Filter datasets safely based on live configurations
  const publicAnnouncements = announcements.filter(
    (a) => !a.status || a.status === "Published",
  );
  const activeEvents = events.filter(
    (e) => !e.status || e.status === "Upcoming" || e.status === "Ongoing",
  );

  // Inclusive Protocol Sorting Engine for Sangguniang Barangay Council Array Rendering
  const activeOfficials = officials
    .filter((o) => !o.status || o.status === "Active")
    .sort((a, b) => {
      const getPositionWeight = (positionStr: string): number => {
        const title = positionStr ? positionStr.toLowerCase() : "";
        if (title.includes("punong") || title.includes("captain")) return 1;
        if (title.includes("secretary")) return 2;
        if (title.includes("treasurer")) return 3;
        if (title.includes("kagawad")) return 4;
        if (title.includes("sk") || title.includes("chairperson")) return 5;
        return 99;
      };
      const weightA = getPositionWeight(a.position);
      const weightB = getPositionWeight(b.position);
      if (weightA !== weightB) return weightA - weightB;

      const nameA = a.name || "";
      const nameB = b.name || "";
      return nameA.localeCompare(nameB);
    });

  const navigationTabs: TabItem[] = [
    { id: "home", label: "Tahanan" },
    { id: "news", label: "Mga Anunsyo" },
    { id: "events", label: "Iskedyul" },
    { id: "services", label: "Mga Serbisyo" },
    { id: "council", label: "Konseho" },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans select-none antialiased overflow-x-hidden">
      {/* 1. SECURED SYSTEM HEADER BRANDING */}
      <header className="w-full bg-slate-900 text-white shadow-md z-30 sticky top-0 border-b border-white/5 shrink-0">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-white font-black text-xs flex items-center justify-center border border-white/5 shrink-0">
              CDL
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <h1 className="text-xs font-black tracking-tight text-white truncate max-w-[160px] sm:max-w-none uppercase">
                  {info.name}
                </h1>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                    Citizen Link
                  </span>
                  {showInstallBtn && (
                    <button
                      onClick={handleInstallAppClick}
                      className="text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-1 rounded border-none outline-none cursor-pointer shadow-sm active:scale-95 transition-all"
                    >
                      I-install PWA
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-bold tracking-wide uppercase truncate mt-0.5">
                {info.municipality} • {info.province}
              </p>
            </div>
          </div>

          {/* DESKTOP ROW TABS */}
          <nav className="hidden md:flex items-center gap-1 text-[11px] font-black uppercase tracking-wider shrink-0">
            {navigationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl cursor-pointer transition-all border-none bg-transparent outline-none ${
                  activeTab === tab.id
                    ? "bg-white/10 text-white shadow-inner"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 2. CORE WORKSPACE SURFACE CONTROLLER */}
      <div className="w-full flex-1 bg-slate-100/60 pb-24 md:pb-8">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* TAHANAN (HOME) SECTION */}
          {activeTab === "home" && (
            <div className="flex flex-col lg:flex-row gap-6 items-start text-xs w-full">
              <div className="w-full lg:w-2/3 space-y-6 min-w-0">
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-white/5 space-y-5">
                  <div>
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-emerald-400 font-mono">
                      Aming Pananaw (Vision)
                    </h3>
                    <p className="text-xs sm:text-sm italic leading-relaxed mt-2 font-medium text-slate-200">
                      "
                      {info.vision ||
                        "Isang maunlad, mapayapa, at luntian na pamayanan..."}
                      "
                    </p>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-emerald-400 font-mono">
                      Tungkulin (Mission)
                    </h3>
                    <p className="text-xs sm:text-sm italic leading-relaxed mt-2 font-medium text-slate-200">
                      "
                      {info.mission ||
                        "Ihatid ang mabilis at de-kalidad na serbisyo publiko..."}
                      "
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">
                    Mabilisang Aksyon para sa Mamamayan
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab("services")}
                      className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl p-5 text-left cursor-pointer transition-all shadow-2xs outline-none group"
                    >
                      <div className="font-black text-slate-900 text-xs uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                        Mag-request ng Dokumento →
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1.5 font-semibold leading-normal">
                        Kumuha ng Barangay Clearance, Indigency, at Certificates
                        online gamit ang form.
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("news")}
                      className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl p-5 text-left cursor-pointer transition-all shadow-2xs outline-none"
                    >
                      <div className="font-black text-slate-900 text-xs uppercase tracking-tight">
                        Tingnan ang mga Anunsyo
                      </div>
                      <div className="text-[11px] text-blue-600 font-black mt-1.5 font-mono uppercase tracking-wide">
                        ● {publicAnnouncements.length} Aktibong Balita sa
                        Pamayanan
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-1/3 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block font-mono">
                    Emergency Desk Hotline
                  </span>
                  <div className="text-base font-mono font-black text-slate-900 border-b border-slate-100 pb-2">
                    {info.contact_number || "Not Available"}
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold truncate">
                    {info.email || "No Official Email Registered"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MGA ANUNSYO (ANNOUNCEMENTS) SECTION */}
          {activeTab === "news" && (
            <div className="space-y-4 max-w-3xl mx-auto text-xs w-full">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
                  Mga Kasalukuyang Anunsyo
                </h3>
              </div>
              {publicAnnouncements.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border text-slate-400 font-bold font-mono">
                  Walang nakalathalang anunsyo sa kasalukuyan.
                </div>
              ) : (
                publicAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3 w-full min-w-0"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-sm font-black text-slate-900 tracking-tight leading-snug">
                        {ann.title}
                      </h4>
                      {ann.priority === "High" && (
                        <span className="bg-rose-500/10 text-rose-600 font-black text-[8px] px-2.5 py-0.5 rounded border border-rose-500/20 uppercase tracking-widest font-mono shrink-0">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 leading-relaxed font-semibold text-[12px] break-words whitespace-pre-wrap">
                      {ann.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ISKEDYUL (SCHEDULES) SECTION */}
          {activeTab === "events" && (
            <div className="space-y-4 text-xs w-full">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
                  Iskedyul at Programa
                </h3>
              </div>
              {activeEvents.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border text-slate-400 font-bold font-mono">
                  Walang nakatakdang aktibidad sa kasalukuyan.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  {activeEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 border-l-4 border-l-blue-600 shadow-sm flex flex-col justify-between space-y-4 min-w-0"
                    >
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight break-words">
                          {evt.title}
                        </h4>
                        <p className="text-slate-500 text-[11px] font-medium leading-relaxed break-words">
                          {evt.description}
                        </p>
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono font-bold bg-slate-50 border p-2.5 rounded-xl flex flex-col gap-1">
                        <div>📅 DATE: {evt.event_date}</div>
                        <div className="truncate">📍 VENUE: {evt.venue}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MGA SERBISYO (SERVICES) SECTION - DESIGNED REMOVING WASHED BLENDS */}
          {activeTab === "services" && (
            <div className="space-y-6 text-xs w-full">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
                  Online Documentation Hub
                </h3>
                <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                  Pumili ng kailangang dokumento sa ibaba para mag-aplay online
                  nang mabilis.
                </p>
              </div>

              {services.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border text-slate-400 font-bold font-mono">
                  Walang nakalistang serbisyo sa kasalukuyan.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between space-y-5 min-w-0 hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight break-words">
                          {srv.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold break-words">
                          {srv.description}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 bg-slate-50 rounded-xl p-3 text-[10px] text-slate-500 border border-slate-200/60 font-bold gap-4">
                          <div>
                            BAYAD (FEES):{" "}
                            <span className="font-black text-blue-600 block text-xs mt-0.5">
                              {srv.fees}
                            </span>
                          </div>
                          <div>
                            PROSESO (TIME):{" "}
                            <span className="font-black text-slate-700 block text-xs font-mono mt-0.5">
                              {srv.processing_time}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedService(srv)}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all border-none outline-none cursor-pointer text-center"
                        >
                          Mag-apply sa Dokumentong Ito
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KONSEHO (COUNCIL DIRECTORY) SECTION */}
          {activeTab === "council" && (
            <div className="space-y-4 text-xs w-full">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
                  Sangguniang Barangay Directory
                </h3>
              </div>
              {activeOfficials.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border text-slate-400 font-bold font-mono">
                  Walang nakatalang opisyal sa kasalukuyan.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  {activeOfficials.map((off) => (
                    <div
                      key={off.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between gap-4 min-w-0"
                    >
                      <div>
                        <div className="font-black text-slate-900 text-sm tracking-tight break-words">
                          {off.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1 font-bold uppercase tracking-wider">
                          Term: {off.term_start} - {off.term_end}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center gap-4 min-w-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono shrink-0">
                          Katungkulan:
                        </span>
                        <span className="text-[11px] bg-slate-50 text-blue-600 border border-slate-200/60 font-black px-3 py-1 rounded-xl truncate font-mono">
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

      {/* 3. CORE POPUP MODAL DIALOGUE FRAME: CITIZEN ENTRY ENGINE */}
      {selectedService && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide font-mono">
                Bagong Request: {selectedService.name}
              </h3>
              <p className="text-slate-400 text-[11px] mt-0.5 font-medium">
                Isumite ang detalye sa ibaba para sa mabilisang pagproseso sa
                LGU.
              </p>
            </div>

            <form
              onSubmit={handleCreateRequest}
              className="space-y-4 text-xs font-bold"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1 tracking-wider font-mono">
                    Pangalan (First Name)
                  </label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold focus:border-slate-400 focus:bg-white transition-all text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1 tracking-wider font-mono">
                    Apelyido (Last Name)
                  </label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold focus:border-slate-400 focus:bg-white transition-all text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1 tracking-wider font-mono">
                  Mobile Number (Para sa SMS Update)
                </label>
                <input
                  required
                  type="tel"
                  placeholder="Hal. 09123456789"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold focus:border-slate-400 focus:bg-white transition-all text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1 tracking-wider font-mono">
                  Dahilan ng Pagkuha (Purpose)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Hal. Local Employment, Scholarship requirement, Passport Application, atbp."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold resize-none focus:border-slate-400 focus:bg-white transition-all text-slate-900 placeholder-slate-400 leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-xl transition-all border-none outline-none cursor-pointer disabled:opacity-50 font-mono"
                >
                  {submittingRequest ? "Ipinapadala..." : "Isumite ang Request"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedService(null);
                    setFirstName("");
                    setLastName("");
                    setContactNumber("");
                    setPurpose("");
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase rounded-xl transition-all border-none outline-none cursor-pointer"
                >
                  Kanselahin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MOBILE PERSISTENT BOTTOM NAVIGATION FOOTER */}
      <nav className="md:hidden bg-white border-t border-slate-200 h-16 flex flex-row items-center justify-between px-2 fixed bottom-0 inset-x-0 z-40 shadow-xl shrink-0">
        {navigationTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center h-full text-[9px] font-black uppercase tracking-wider cursor-pointer border-none bg-transparent outline-none transition-all duration-100 ${
              activeTab === tab.id
                ? "text-blue-600 bg-slate-50/60 font-black rounded-xl"
                : "text-slate-400 font-bold"
            }`}
          >
            <span className="block truncate text-center w-full px-0.5">
              {tab.id === "home"
                ? "Home"
                : tab.id === "news"
                  ? "Balita"
                  : tab.id === "events"
                    ? "Schedules"
                    : tab.id === "services"
                      ? "Serbisyo"
                      : "Konseho"}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
