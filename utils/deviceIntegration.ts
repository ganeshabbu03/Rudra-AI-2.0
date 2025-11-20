
export interface Contact {
  name: string;
  number: string;
}

// Simulated Secure Contact Database
// In a real native implementation, this would bridge to the device contacts API.
export const MOCK_CONTACTS: Contact[] = [
  { name: 'Boss', number: '15550101' },
  { name: 'Home', number: '15550102' },
  { name: 'Emergency', number: '911' },
  { name: 'Sarah', number: '15550123' },
  { name: 'Tony', number: '15550999' }
];

// Common URL Schemes for Android/iOS
export const APP_SCHEMES: Record<string, (query?: string) => string> = {
  'whatsapp': (q) => `whatsapp://send?text=${encodeURIComponent(q || '')}`,
  'youtube': (q) => q ? `vnd.youtube://results?search_query=${encodeURIComponent(q)}` : `vnd.youtube://`,
  'spotify': (q) => q ? `spotify:search:${encodeURIComponent(q)}` : `spotify:`,
  'maps': (q) => `geo:0,0?q=${encodeURIComponent(q || '')}`,
  'instagram': () => `instagram://app`,
  'twitter': () => `twitter://`,
  'facebook': () => `fb://`,
  'chrome': (q) => q ? `googlechrome://navigate?url=${encodeURIComponent(q)}` : `googlechrome://`,
  'gmail': () => `googlegmail://`,
  'calendar': () => `content://com.android.calendar/time/`,
  'camera': () => `intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end`,
  'clock': () => `content://com.android.deskclock/clock`,
};

export const findContact = (name: string): Contact | undefined => {
  const normalized = name.toLowerCase();
  return MOCK_CONTACTS.find(c => c.name.toLowerCase().includes(normalized));
};

export const performDeviceAction = (action: 'call' | 'sms' | 'whatsapp' | 'launch', target: string, payload?: string): { success: boolean, message: string } => {
  
  try {
    if (action === 'launch') {
      // Fuzzy match app name
      const appKey = Object.keys(APP_SCHEMES).find(k => k.includes(target.toLowerCase()) || target.toLowerCase().includes(k));
      
      if (appKey) {
        const url = APP_SCHEMES[appKey](payload);
        window.location.href = url;
        return { success: true, message: `Launching ${target}...` };
      } else {
        // Fallback for unknown apps - try generic scheme or search
        return { success: false, message: `App protocol for ${target} not found in local database.` };
      }
    }

    const contact = findContact(target);
    const number = contact ? contact.number : target.replace(/[^0-9+]/g, ''); // Use name if found, else assume raw number

    if (!number && (action === 'call' || action === 'sms' || action === 'whatsapp')) {
      return { success: false, message: `Contact ${target} not found.` };
    }

    if (action === 'call') {
      window.location.href = `tel:${number}`;
      return { success: true, message: `Dialing ${contact?.name || number}...` };
    }

    if (action === 'sms') {
      window.location.href = `sms:${number}?body=${encodeURIComponent(payload || '')}`;
      return { success: true, message: `Opening SMS to ${contact?.name || number}...` };
    }

    if (action === 'whatsapp') {
      // WhatsApp Web/App link
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(payload || '')}`, '_blank');
      return { success: true, message: `Opening WhatsApp chat with ${contact?.name || number}...` };
    }

    return { success: false, message: 'Unknown protocol.' };

  } catch (e) {
    console.error(e);
    return { success: false, message: 'Device bridge error.' };
  }
};
