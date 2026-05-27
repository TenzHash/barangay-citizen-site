import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import type {
  BarangayInfo,
  Announcement,
  Event as BarangayEvent,
  Official,
  BarangayService,
} from "./types";

// Define strict types for the local state container
type TabId = "home" | "news" | "events" | "services" | "council";

interface TabItem {
  id: TabId;
  label: string;
}

export default function App() {
  // PWA Installation States
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Core Layout States
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

  // Database Structured State Objects
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

  // 1. Capture PWA Browser Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  // 2. Data Fetch Interceptor
  useEffect(() => {
    async function loadLiveCitizenData() {
      try {
        setLoading(true);

        const [infoRes, annRes, evtRes, srvRes, offRes] = await Promise.all([
          supabase.from("barangay_info").select("*").maybeSingle(),
          supabase
            .from("announcements")
            .select("*")
            .order("date_published", { ascending: false }),
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
        console.error("Citizen site data fetch failure:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLiveCitizenData();
  }, []);

  // Submit Document Request Handler
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    try {
      setSubmittingRequest(true);

      const { error } = await supabase.from("document_requests").insert([
        {
          service_id: selectedService.id,
          resident_first_name: firstName,
          resident_last_name: lastName,
          contact_number: contactNumber,
          purpose: purpose,
          status: "Pending",
        },
      ]);

      if (error) throw error;

      alert(
        "Ang inyong hiling ay matagumpay na naipadala! Makakatanggap kayo ng SMS notification kapag handa na ito para sa pickup.",
      );

      // Reset Form Fields
      setFirstName("");
      setLastName("");
      setContactNumber("");
      setPurpose("");
      setSelectedService(null);
    } catch (err) {
      console.error("Error submitting document request:", err);
      alert("May naganap na kamalian sa pagpapadala. Pakisubukang muli.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowInstallBtn(false);
    setDeferredPrompt(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
        <div className="animate-pulse">Connecting to LGU Network Core...</div>
      </div>
    );
  }

  const currentInfo = info || {
    name: "Barangay 17 - Rizal Street (Ilawod)",
    municipality: "Legazpi City",
    province: "Albay",
    contact_number: "(052) 742-1717",
    email: "bgy17.ilawod@legazpi.gov.ph",
    vision: "Isang maunlad, mapayapa, at luntian na pamayanan...",
    mission: "Ihatid ang mabilis at de-kalidad na serbisyo publiko...",
  };

  const publicAnnouncements = announcements.filter(
    (a) => !a.status || a.status === "Published",
  );
  const activeEvents = events.filter(
    (e) => !e.status || e.status === "Upcoming" || e.status === "Ongoing",
  );

  // Inclusive Protocol Sorting Engine for Council Members
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
      return (
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
      );
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
      {/* 1. HEADER BRANDING & NAVIGATION */}
      <header className="w-full bg-slate-900 text-white shadow-md z-30 sticky top-0 border-b border-slate-800 shrink-0">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white text-slate-900 font-black text-sm flex items-center justify-center shadow-md shrink-0">
              RP
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white truncate max-w-[180px] sm:max-w-none">
                  {currentInfo.name}
                </h1>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                    Live Portal
                  </span>
                  {showInstallBtn && (
                    <button
                      onClick={handleInstallApp}
                      className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-900 px-2.5 py-1 rounded-md animate-pulse cursor-pointer border-none outline-none"
                    >
                      I-install
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium tracking-wide truncate mt-0.5">
                {currentInfo.municipality}, {currentInfo.province}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 h-full text-xs font-bold uppercase tracking-wider shrink-0">
            {navigationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl cursor-pointer transition-all border-none bg-transparent outline-none ${activeTab === tab.id ? "bg-white/10 text-white font-extrabold shadow-inner border-b-2 border-slate-300" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE VIEW */}
      <div className="w-full flex-1 bg-slate-50/40 pb-24 md:pb-8">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* HOME TAB */}
          {activeTab === "home" && (
            <div className="flex flex-col lg:flex-row gap-6 items-start text-xs w-full">
              <div className="w-full lg:w-2/3 space-y-6 min-w-0">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm border border-white/5 space-y-4">
                  <div>
                    <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                      Aming Pananaw (Vision)
                    </h3>
                    <p className="text-xs sm:text-sm italic leading-relaxed mt-2 font-light text-slate-200">
                      "{currentInfo.vision}"
                    </p>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                      Tungkulin (Mission)
                    </h3>
                    <p className="text-xs sm:text-sm italic leading-relaxed mt-2 font-light text-slate-200">
                      "{currentInfo.mission}"
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-2xs space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Mabilisang Aksyon para sa Mamamayan
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab("services")}
                      className="bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/60 rounded-2xl p-5 text-left cursor-pointer transition-all shadow-2xs outline-none"
                    >
                      <div className="font-bold text-slate-800 text-xs">
                        Mag-request ng Dokumento
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1.5 font-medium leading-normal">
                        Kumuha ng Barangay Clearance, Indigency, at Certificates
                        online.
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("news")}
                      className="bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/60 rounded-2xl p-5 text-left cursor-pointer transition-all shadow-2xs outline-none"
                    >
                      <div className="font-bold text-slate-800 text-xs">
                        Tingnan ang mga Anunsyo
                      </div>
                      <div className="text-[11px] text-blue-600 font-bold mt-1.5 font-mono">
                        {publicAnnouncements.length} Aktibong Balita sa
                        Pamayanan.
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-1/3 space-y-4">
                <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-5 space-y-2.5">
                  <span className="text-[9px] font-extrabold text-rose-800 uppercase tracking-widest block">
                    Emergency Desk Hotline
                  </span>
                  <div className="text-base font-mono font-black text-rose-700">
                    {currentInfo.contact_number}
                  </div>
                  <div className="text-[11px] text-rose-600 font-medium truncate">
                    {currentInfo.email}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ANNOUNCEMENTS TAB */}
          {activeTab === "news" && (
            <div className="space-y-6 max-w-4xl mx-auto text-xs font-medium w-full">
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Mga Kasalukuyang Anunsyo
                </h3>
              </div>
              {publicAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-2xs space-y-3 w-full min-w-0"
                >
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="text-sm font-black text-slate-900 leading-snug">
                      {ann.title}
                    </h4>
                    {ann.priority === "High" && (
                      <span className="bg-rose-50 text-rose-700 font-extrabold text-[8px] px-2.5 py-1 rounded-md border border-rose-100 uppercase tracking-wider shrink-0">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 leading-relaxed font-medium text-[12px] break-words">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* SCHEDULES TAB */}
          {activeTab === "events" && (
            <div className="space-y-6 text-xs font-medium w-full">
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Iskedyul at Programa
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
                {activeEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 border-l-4 border-l-blue-600 shadow-sm flex flex-col justify-between space-y-4 min-w-0"
                  >
                    <h4 className="text-sm font-black text-slate-800 leading-tight break-words">
                      {evt.title}
                    </h4>
                    <p className="text-slate-500 text-[11px] font-normal break-words">
                      {evt.description}
                    </p>
                    <div className="text-[11px] text-slate-400 font-mono bg-slate-50 p-2 rounded border">
                      {evt.event_date} | {evt.venue}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SERVICES TAB WITH DISPATCH REQUEST BUTTON TRIGGER */}
          {activeTab === "services" && (
            <div className="space-y-6 text-xs w-full">
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Online Documentation Hub
                </h3>
                <p className="text-slate-400 text-[11px] font-normal mt-0.5">
                  Pumili ng kailangang dokumento sa ibaba para mag-aplay online.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4 min-w-0"
                  >
                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-slate-800 leading-tight break-words">
                        {srv.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium break-words">
                        {srv.description}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 bg-slate-50 rounded-xl p-3 text-[10px] text-slate-500 border border-slate-100 font-medium gap-2">
                        <div>
                          Bayad:{" "}
                          <span className="font-bold text-blue-600 block text-xs mt-0.5">
                            {srv.fees}
                          </span>
                        </div>
                        <div>
                          Pagproseso:{" "}
                          <span className="font-bold text-slate-700 block text-xs font-mono mt-0.5">
                            {srv.processing_time}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedService(srv)}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border-none outline-none cursor-pointer text-center"
                      >
                        Mag-apply sa Dokumentong Ito
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COUNCIL DIRECTORY TAB */}
          {activeTab === "council" && (
            <div className="space-y-6 text-xs w-full">
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Sangguniang Barangay Directory
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {activeOfficials.map((off) => (
                  <div
                    key={off.id}
                    className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-3 min-w-0"
                  >
                    <div>
                      <div className="font-black text-slate-800 text-sm tracking-tight break-words">
                        {off.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1 font-semibold">
                        Term: {off.term_start} - {off.term_end}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-50 flex justify-between items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 shrink-0">
                        Katungkulan:
                      </span>
                      <span className="text-[11px] bg-slate-50 text-blue-600 border border-slate-100 font-extrabold px-3 py-1 rounded-xl truncate">
                        {off.position}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. POPUP MODAL: CITIZEN REQUEST ENTRY FORM */}
      {selectedService && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Bagong Request: {selectedService.name}
              </h3>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Isumite ang detalye para sa mabilisang pagproseso.
              </p>
            </div>

            <form
              onSubmit={handleCreateRequest}
              className="space-y-3.5 text-xs font-bold"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Pangalan (First Name)
                  </label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Apelyido (Last Name)
                  </label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">
                  Mobile Number (Para sa SMS update)
                </label>
                <input
                  required
                  type="tel"
                  placeholder="Hal. 09123456789"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-medium focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">
                  Dahilan ng Pagkuha (Purpose)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Hal. Local Employment, Scholarship, atbp."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium resize-none focus:border-slate-400"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all border-none outline-none cursor-pointer disabled:opacity-50"
                >
                  {submittingRequest ? "Ipinapadala..." : "Isumite ang Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all border-none outline-none cursor-pointer"
                >
                  Kanselahin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MOBILE SYSTEM NAVIGATION */}
      <nav className="md:hidden bg-white border-t border-slate-200 h-16 flex flex-row items-center justify-between px-2 fixed bottom-0 inset-x-0 z-40 shadow-lg">
        {navigationTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center h-full text-[9px] uppercase tracking-wider cursor-pointer border-none bg-transparent outline-none transition-all duration-150 ${activeTab === tab.id ? "text-blue-600 font-black bg-slate-50" : "text-slate-400 font-bold"}`}
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
