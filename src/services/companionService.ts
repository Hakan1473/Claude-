import type { CompanionMessage, NurseAlert, PatientAnalysis } from '../types/companion';

export interface CompanionChatResponse {
  replyText: string;
  audioBase64: string | null;
  detectedLanguage: string;
  detectedLanguageCode: string;
  detectedLanguageFlag: string;
  analysis: PatientAnalysis;
  suggestedQuickReplies: string[];
}

export async function sendCompanionMessage(params: {
  message: string;
  history?: CompanionMessage[];
  roomNumber?: string;
  patientName?: string;
}): Promise<CompanionChatResponse> {
  const response = await fetch('/api/companion/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Hasta asistanı ile bağlantı kurulamadı');
  }

  return response.json();
}

export async function dispatchNurseAlert(params: {
  patientRoom: string;
  patientName: string;
  detectedLanguage: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  summaryTr: string;
  patientOriginalText: string;
  requests: string[];
  symptoms: string[];
  painLevel?: number | null;
}): Promise<NurseAlert> {
  const response = await fetch('/api/companion/dispatch-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Hemşire bildirimi iletilemedi');
  }

  const data = await response.json();
  return data.alert;
}

export async function fetchNurseAlerts(): Promise<NurseAlert[]> {
  const response = await fetch('/api/companion/alerts');
  if (!response.ok) return [];
  const data = await response.json();
  return data.alerts || [];
}

export async function updateAlertStatus(
  id: string,
  status: 'acknowledged' | 'resolved'
): Promise<void> {
  await fetch(`/api/companion/alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

// Play audio from base64 string
export function playBase64Audio(b64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${b64}`);
      audio.onended = () => resolve();
      audio.onerror = (e) => reject(e);
      audio.play().catch((err) => {
        console.warn('Audio auto-play note:', err);
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

export async function fetchInitialGreeting(): Promise<{ text: string; audioBase64: string | null }> {
  try {
    const res = await fetch('/api/companion/init-greeting', { method: 'POST' });
    if (!res.ok) throw new Error('Greeting failed');
    return await res.json();
  } catch {
    return {
      text: 'Merhabalar, ben yapay zeka asistanınızım. Size nasıl yardımcı olabilirim?',
      audioBase64: null,
    };
  }
}

export async function generateSessionReport(params: {
  history: CompanionMessage[];
  roomNumber?: string;
  patientName?: string;
}): Promise<import('../types/companion').CompanionReport> {
  const response = await fetch('/api/companion/generate-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Rapor oluşturulamadı');
  }

  const data = await response.json();
  return data.report;
}
