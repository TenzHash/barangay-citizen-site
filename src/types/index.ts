export interface BarangayInfo {
  id: string;
  name: string;
  vision: string;
  mission: string;
  municipality: string;
  province: string;
  email: string;
  contact_number: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  venue: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
}

export interface Official {
  id: string;
  name: string;
  position: string;
  term_start: string;
  term_end: string;
  status: 'Active' | 'Inactive';
}

export interface BarangayService {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  processing_time: string;
  fees: string;
}

export interface CitizenDocumentRequest {
  id: string;
  citizen_name: string;
  document_type: string;
  purpose: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Ready';
  requested_at: string;
}

// Add this interface right at the bottom of the file
export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'Low' | 'Normal' | 'High';
  status: 'Draft' | 'Published';
  date_published: string; // <-- Changed from created_at to match App.tsx line 279
}