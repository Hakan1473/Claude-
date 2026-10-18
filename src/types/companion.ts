export interface PatientAnalysis {
  painLevel: number | null; // 0 to 10 scale
  symptoms: string[];
  requests: string[]; // e.g. "su", "battaniye", "klima", "hemşire"
  urgency: 'low' | 'medium' | 'high' | 'critical';
  sentiment: 'calm' | 'anxious' | 'in_pain' | 'relieved' | 'confused';
  nurseAlertTr: string;
}

export interface CompanionMessage {
  id: string;
  sender: 'patient' | 'companion';
  text: string;
  audioBase64?: string;
  detectedLanguage?: string;
  detectedLanguageCode?: string;
  detectedLanguageFlag?: string;
  timestamp: number;
  analysis?: PatientAnalysis;
}

export interface NurseAlert {
  id: string;
  patientRoom: string;
  patientName: string;
  detectedLanguage: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  summaryTr: string;
  patientOriginalText: string;
  requests: string[];
  symptoms: string[];
  painLevel?: number | null;
  status: 'pending' | 'acknowledged' | 'resolved';
  timestamp: number;
}

export interface CompanionReport {
  briefSummaryTr: string;
  patientChiefComplaints: string[];
  patientNeedsAndRequests: string[];
  painSummary?: string;
  painLevel?: number | null;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  nurseActionReportTr: string;
  timestamp: number;
  patientRoom: string;
  patientName: string;
}
