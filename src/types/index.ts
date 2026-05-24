export interface BarangayInfo {
  id: string;
  name: string;
  municipality: string;
  province: string;
  contact_number: string; -- Matches database snake_case field
  email: string;
  vision: string;
  mission: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'High' | 'Normal' | 'Low';
  status: 'Published' | 'Draft' | 'Archived';
  date_published: string; -- Matches database snake_case field
}

export interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string; -- Matches database snake_case field
  event_time: string; -- Matches database snake_case field
  venue: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
}

export interface Official {
  id: string;
  name: string;
  position: string;
  term_start: string; -- Matches database snake_case field
  term_end: string; -- Matches database snake_case field
  status: 'Active' | 'Inactive';
}

export interface BarangayService {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  processing_time: string; -- Matches database snake_case field
  fees: string;
}