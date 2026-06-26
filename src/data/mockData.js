// Mock Database Layer with localStorage persistence

const DEFAULT_USERS = [
  { id: "u-1", name: "Director Idowu", email: "admin@beacon.com", role: "Super Admin", status: "Active", phone: "08012345678", dateAdded: "2024-01-01" },
  { id: "u-2", name: "Ahmad Bello", email: "closer1@beacon.com", role: "Sales Closer", status: "Active", phone: "08924752133", dateAdded: "2024-02-15", branch: "Lekki Branch" },
  { id: "u-3", name: "Sarah Ali", email: "closer2@beacon.com", role: "Sales Closer", status: "Active", phone: "08033742171", dateAdded: "2024-03-10", branch: "Maitama Branch" },
  { id: "u-4", name: "Lina Rodriguez", email: "closer3@beacon.com", role: "Sales Closer", status: "Active", phone: "08592237460", dateAdded: "2024-04-01", branch: "Maitama Branch" },
  { id: "u-5", name: "Omar Farouk", email: "closer4@beacon.com", role: "Sales Closer", status: "Active", phone: "09081237456", dateAdded: "2024-05-12", branch: "Airport Residential Branch" },
  { id: "u-6", name: "Marcus Johansson", email: "closer5@beacon.com", role: "Sales Closer", status: "Active", phone: "08345729100", dateAdded: "2024-06-01", branch: "Lekki Branch" },
  { id: "u-7", name: "Emily Chen", email: "closer6@beacon.com", role: "Sales Closer", status: "Active", phone: "07823456123", dateAdded: "2024-06-15", branch: "Lekki Branch" },
  { id: "u-8", name: "Babatunde Alao", email: "officer1@beacon.com", role: "Inspection Officer", status: "Active", phone: "08199887766", dateAdded: "2024-02-01" },
  { id: "u-9", name: "Chioma Nze", email: "officer2@beacon.com", role: "Inspection Officer", status: "Active", phone: "08233445566", dateAdded: "2024-03-20" },
  { id: "u-10", name: "Funmi Adebayo", email: "doc1@beacon.com", role: "Admin/Doc Officer", status: "Active", phone: "08055667788", dateAdded: "2024-01-10" },
  // Preconfigured default accounts for the 4 core roles
  { id: "u-11", name: "Remi Adeleke", email: "remi@beacon.com", role: "Relationship Manager", status: "Active", phone: "08143210987", dateAdded: "2024-07-01" },
  { id: "u-12", name: "Hadiza Musa", email: "hadiza@beacon.com", role: "Head of Operations", status: "Active", phone: "08065432109", dateAdded: "2024-07-05" },
  { id: "u-13", name: "Biyi Ojo", email: "biyi@beacon.com", role: "Branch Manager", status: "Active", phone: "09076543210", dateAdded: "2024-07-10", branch: "Lekki Branch" },
  { id: "u-14", name: "Gbenga Daniel", email: "gbenga@beacon.com", role: "General Manager", status: "Active", phone: "08022223333", dateAdded: "2024-07-15" }
];

const DEFAULT_LEADS = [
  {
    id: "l-1",
    name: "Adeyemi Adelabu",
    phone: "08924752133",
    whatsapp: "08924752133",
    email: "adeyemi.a@example.com",
    location: "Lekki Phase 1, Lagos",
    source: "Referral",
    category: "Investor Wealth",
    stage: "Negotiation",
    temperature: "Hot",
    assignedCloserId: "u-2", // Ahmad Bello
    branch: "Lekki Branch",
    budget: "₦150,000,000",
    propertyInterest: "5 Bedroom Fully Detached Duplex",
    nextAction: "Present revised contract proposal",
    followUpDate: "2026-06-05T10:00",
    lastActivityDate: "2026-06-04T12:00",
    dateCreated: "2024-10-10T09:00",
    status: "Active"
  },
  {
    id: "l-2",
    name: "Ibrahim Babangida",
    phone: "08033742171",
    whatsapp: "08033742171",
    email: "ibrahim.b@example.com",
    location: "Maitama, Abuja",
    source: "Paid Ads",
    category: "Incoming Wealth",
    stage: "New Lead",
    temperature: "Hot",
    assignedCloserId: "u-3", // Sarah Ali
    branch: "Maitama Branch",
    budget: "₦250,000,000",
    propertyInterest: "Diplomatic Mansion",
    nextAction: "Initial discovery call",
    followUpDate: "2026-06-04T17:00",
    lastActivityDate: "2026-06-04T14:30",
    dateCreated: "2024-08-02T11:00",
    status: "Active"
  },
  {
    id: "l-3",
    name: "Chinwe Eze",
    phone: "07744123988",
    whatsapp: "07744123988",
    email: "chinwe.eze@example.com",
    location: "Enugu Golf Estate",
    source: "Facebook",
    category: "Active Wealth",
    stage: "Contact Attempted",
    temperature: "Warm",
    assignedCloserId: null, // Unassigned (Violation!)
    branch: null,
    budget: "₦85,000,000",
    propertyInterest: "4 Bedroom Terrace",
    nextAction: "", // Violation: Lack a next action
    followUpDate: "", // Violation: Lack a follow-up date
    lastActivityDate: "2026-06-02T10:00",
    dateCreated: "2024-07-28T08:30",
    status: "Active"
  },
  {
    id: "l-4",
    name: "Fatima Yusuf",
    phone: "08592237460",
    whatsapp: "08592237460",
    email: "fatima.y@example.com",
    location: "Guzape, Abuja",
    source: "Organic Search",
    category: "Revival Wealth",
    stage: "Conversation Started",
    temperature: "Warm",
    assignedCloserId: "u-4", // Lina Rodriguez
    branch: "Maitama Branch",
    budget: "₦120,000,000",
    propertyInterest: "3 Bedroom Penthouse",
    nextAction: "Send brochure and pricing sheet",
    followUpDate: "2026-06-04T15:00",
    lastActivityDate: "2026-06-03T16:00",
    dateCreated: "2024-09-04T14:00",
    status: "Active"
  },
  {
    id: "l-5",
    name: "Kwame Nkrumah",
    phone: "09081237456",
    whatsapp: "09081237456",
    email: "kwame.n@example.com",
    location: "Airport Residential, Accra",
    source: "Email Campaign",
    category: "Reserved Wealth",
    stage: "Qualified Prospect",
    temperature: "Cold",
    assignedCloserId: "u-5", // Omar Farouk
    branch: "Airport Residential Branch",
    budget: "₦180,000,000",
    propertyInterest: "Luxury Commercial Space",
    nextAction: "Schedule zoom presentation",
    followUpDate: "2026-06-08T11:00",
    lastActivityDate: "2026-05-28T09:00",
    dateCreated: "2024-01-18T10:15",
    status: "Active"
  },
  {
    id: "l-6",
    name: "Zainab Abubakar",
    phone: "07823456123",
    whatsapp: "07823456123",
    email: "zainab.a@example.com",
    location: "Ikoyi, Lagos",
    source: "Instagram",
    category: "Market Wealth",
    stage: "Inspection Booked",
    temperature: "Cold",
    assignedCloserId: "u-7", // Emily Chen
    branch: "Lekki Branch",
    budget: "₦350,000,000",
    propertyInterest: "Waterfront Mansion Lot",
    nextAction: "Accompany client to Lekki site inspection",
    followUpDate: "2026-06-05T14:00",
    lastActivityDate: "2026-06-04T09:00",
    dateCreated: "2024-01-14T15:45",
    status: "Active"
  },
  {
    id: "l-7",
    name: "Tunde Bakare",
    phone: "08345729100",
    whatsapp: "08345729100",
    email: "tunde.b@example.com",
    location: "Victoria Island, Lagos",
    source: "Direct Traffic",
    category: "Untapped Wealth",
    stage: "Reservation",
    temperature: "Cold",
    assignedCloserId: "u-6", // Marcus Johansson
    branch: "Lekki Branch",
    budget: "₦95,000,000",
    propertyInterest: "2 Bedroom Serviced Apartment",
    nextAction: "Confirm reservation deposit receipt",
    followUpDate: "2026-06-05T09:00",
    lastActivityDate: "2026-06-04T11:00",
    dateCreated: "2024-12-16T12:00",
    status: "Active"
  },
  {
    id: "l-8",
    name: "Bello Oyebanji",
    phone: "08055661122",
    whatsapp: "08055661122",
    email: "bello.o@example.com",
    location: "Epe, Lagos",
    source: "Waitlist",
    category: "Incoming Wealth",
    stage: "Payment",
    temperature: "Hot",
    assignedCloserId: "u-2", // Ahmad Bello
    branch: "Lekki Branch",
    budget: "₦45,000,000",
    propertyInterest: "Beacon Heights Estate Plot",
    nextAction: "Follow up on outstanding documentation deposit",
    followUpDate: "2026-06-04T12:00",
    lastActivityDate: "2026-06-03T10:00",
    dateCreated: "2025-02-10T14:20",
    status: "Active"
  },
  {
    id: "l-9",
    name: "Chukwuma Obi",
    phone: "08123450987",
    whatsapp: "08123450987",
    email: "chukwuma.o@example.com",
    location: "Asaba, Delta",
    source: "Walk-in",
    category: "Investor Wealth",
    stage: "Documentation",
    temperature: "Warm",
    assignedCloserId: "u-3", // Sarah Ali
    branch: "Maitama Branch",
    budget: "₦60,000,000",
    propertyInterest: "Beacon Grove Plot 4",
    nextAction: "Verify deed of assignment signatures",
    followUpDate: "2026-06-06T11:00",
    lastActivityDate: "2026-06-04T13:00",
    dateCreated: "2025-03-15T16:00",
    status: "Active"
  },
  {
    id: "l-10",
    name: "Aisha Mohammed",
    phone: "08099887755",
    whatsapp: "08099887755",
    email: "aisha.m@example.com",
    location: "Jabi, Abuja",
    source: "Webinar",
    category: "Client/Investor",
    stage: "Client/Investor",
    temperature: "Hot",
    assignedCloserId: "u-4", // Lina Rodriguez
    branch: "Maitama Branch",
    budget: "₦300,000,000",
    propertyInterest: "6 Bedroom Smart Mansion",
    nextAction: "Send details of next project release",
    followUpDate: "2026-06-10T09:00",
    lastActivityDate: "2026-06-04T14:00",
    dateCreated: "2025-01-20T10:00",
    status: "Active",
    relationshipStatus: "Warm",
    referralStatus: "Requested",
    satisfactionScore: 5,
    referralCount: 2,
    lastContactDate: "2026-06-04"
  },
  {
    id: "l-11",
    name: "Oluwaseun Ajayi",
    phone: "08011223344",
    whatsapp: "08011223344",
    email: "oluwaseun.ajayi@example.com",
    location: "Lekki Phase 1, Lagos",
    source: "Paid Ads",
    category: "Investor Wealth",
    stage: "Repeat Purchase",
    temperature: "Hot",
    assignedCloserId: "u-2", // Ahmad Bello
    branch: "Lekki Branch",
    budget: "₦90,000,000",
    propertyInterest: "Beacon Waterfront unit 2",
    nextAction: "Follow up on referral lead",
    followUpDate: "2026-06-25T11:00",
    lastActivityDate: "2026-06-22T10:00",
    dateCreated: "2025-05-10T09:00",
    status: "Active",
    relationshipStatus: "Active",
    referralStatus: "Generated Referral",
    satisfactionScore: 4,
    referralCount: 1,
    lastContactDate: "2026-06-22"
  },
  {
    id: "l-12",
    name: "Chioma Okoye",
    phone: "08099881122",
    whatsapp: "08099881122",
    email: "chioma.o@example.com",
    location: "Maitama, Abuja",
    source: "Referral",
    category: "Investor Wealth",
    stage: "New Lead",
    temperature: "Hot",
    assignedCloserId: "u-3", // Sarah Ali
    branch: "Maitama Branch",
    budget: "₦120,000,000",
    propertyInterest: "Beacon Palms Villa",
    nextAction: "Call referred contact",
    followUpDate: "2026-06-24T10:00",
    lastActivityDate: "2026-06-23T08:00",
    dateCreated: "2026-06-23T08:00",
    status: "Active",
    referredById: "l-11" // Oluwaseun Ajayi
  }
];

const DEFAULT_INSPECTIONS = [
  {
    id: "i-1",
    leadId: "l-6", // Zainab Abubakar
    estate: "Beacon Waterfront, Lekki",
    date: "2026-06-05",
    time: "14:00",
    meetingPoint: "Beacon Lekki Office",
    assignedCloserId: "u-7", // Emily Chen
    inspectionOfficerId: "u-8", // Babatunde Alao
    status: "Confirmed",
    internalNotes: "Client wants to inspect boundary beacons specifically.",
    createdBy: "Emily Chen",
    createdDate: "2026-06-04T09:00"
  },
  {
    id: "i-2",
    leadId: "l-1", // Adeyemi Adelabu
    estate: "Beacon Heights, Lekki",
    date: "2026-06-04",
    time: "11:00",
    meetingPoint: "VGC Gatehouse",
    assignedCloserId: "u-2", // Ahmad Bello
    inspectionOfficerId: "u-8", // Babatunde Alao
    status: "Completed",
    internalNotes: "Client visited. Impressed with access roads. Report attached.",
    createdBy: "Ahmad Bello",
    createdDate: "2026-06-01T10:00",
    report: "The inspection went exceptionally well. The client was impressed with the infrastructure progress, especially the paved internal roads and perimeter fence. Client requested a payment plan for Plot 12.",
    feedback: "Very positive. Eager to receive the payment structure.",
    nextStepRecommendation: "Send payment breakdown sheet.",
    photos: []
  },
  {
    id: "i-3",
    leadId: "l-4", // Fatima Yusuf
    estate: "Beacon Hill, Guzape",
    date: "2026-06-03",
    time: "15:00",
    meetingPoint: "Sheraton Lobby",
    assignedCloserId: "u-4", // Lina Rodriguez
    inspectionOfficerId: "u-9", // Chioma Nze
    status: "No-Show",
    internalNotes: "Client was unreachable at the inspection time.",
    createdBy: "Lina Rodriguez",
    createdDate: "2026-06-02T14:00",
    noShowNote: "Client called later stating they were held back by an urgent flight to Port Harcourt."
  }
];

const DEFAULT_ACTIVITIES = [
  {
    id: "a-1",
    leadId: "l-1",
    date: "2026-06-04T12:00",
    type: "Call",
    summary: "Negotiated price discount. Client requested additional 5% off.",
    objections: "Price slightly higher than competitor offerings in Lekki.",
    feedback: "Still highly interested. Ready to commit if we meet halfway.",
    nextStep: "Confirm discount approval with Director.",
    loggedBy: "Ahmad Bello"
  },
  {
    id: "a-2",
    leadId: "l-2",
    date: "2026-06-04T14:30",
    type: "WhatsApp",
    summary: "Introductory details sent. Confirmed receipt of project video.",
    objections: "Wants to ensure electricity grid is fully stable.",
    feedback: "Likes the estate location and luxury finishes.",
    nextStep: "Discovery call scheduled for 5 PM.",
    loggedBy: "Sarah Ali"
  },
  {
    id: "a-3",
    leadId: "l-7",
    date: "2026-06-04T11:00",
    type: "Internal Note",
    summary: "Client paid reservation fee of ₦5,000,000.",
    objections: "None",
    feedback: "Eager to get allocation papers sorted.",
    nextStep: "Liaise with finance team.",
    loggedBy: "Marcus Johansson"
  }
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: "n-1",
    type: "New Lead Unassigned",
    message: "New lead 'Chinwe Eze' has remained unassigned for more than 24 hours.",
    timestamp: "2026-06-04T10:00:00",
    read: false,
    link: "/leads/l-3"
  },
  {
    id: "n-2",
    type: "Missed Follow-up",
    message: "Ahmad Bello missed follow-up with lead 'Bello Oyebanji' scheduled for today at 12:00.",
    timestamp: "2026-06-04T13:00:00",
    read: false,
    link: "/follow-ups"
  },
  {
    id: "n-3",
    type: "Dormant Lead",
    message: "Lead 'Kwame Nkrumah' has had no activity logged in the past 7 days.",
    timestamp: "2026-06-04T08:00:00",
    read: true,
    link: "/leads/l-5"
  }
];

const DEFAULT_PROPERTIES = [
  { id: "p-1", name: "Beacon Heights, Lekki", type: "Estate Plot", location: "Lekki, Lagos", totalUnits: 50, availableUnits: 12, price: 50000000, status: "Selling", description: "Premium serviced plots in Lekki with 24/7 power, treated water, and paved roads.", amenities: ["24/7 Power", "Paved Roads", "Perimeter Fence", "Water Treatment"] },
  { id: "p-2", name: "Beacon Waterfront, Lekki", type: "5 Bedroom Duplex", location: "Lekki, Lagos", totalUnits: 10, availableUnits: 3, price: 250000000, status: "Selling", description: "Ultra-luxury waterfront duplexes with private jetty, smart automation, and infinity pool.", amenities: ["Waterfront View", "Jetty Access", "Smart Home Automation", "Infinity Pool", "24/7 Security"] },
  { id: "p-3", name: "Beacon Hill, Guzape", type: "3 Bedroom Penthouse", location: "Guzape, Abuja", totalUnits: 20, availableUnits: 6, price: 120000000, status: "Selling", description: "Stunning penthouses overlooking Guzape Hills, featuring floor-to-ceiling windows, and private elevator.", amenities: ["Panoramic Views", "Private Elevator", "Gymnasium", "24/7 CCTV"] },
  { id: "p-4", name: "Beacon Grove, Epe", type: "Estate Plot", location: "Epe, Lagos", totalUnits: 100, availableUnits: 45, price: 15000000, status: "Selling", description: "Fast-developing investment estate in Epe, suitable for high ROI residential/commercial buildings.", amenities: ["Drainage System", "Security Post", "Streetlights", "Green Areas"] },
  { id: "p-5", name: "Beacon Palms, Maitama", type: "6 Bedroom Mansion", location: "Maitama, Abuja", totalUnits: 5, availableUnits: 5, price: 450000000, status: "Planned", description: "Exclusive smart diplomatic mansions in Maitama. Booking of units currently on reservation.", amenities: ["Diplomatic Zone", "Bulletproof Doors", "Private Cinema", "Swimming Pool", "Automation"] }
];

const DEFAULT_SETTINGS = {
  contactHoursLimit: 24,
  dormancyDaysThreshold: 7,
  inspectionConfirmationHours: 24,
  remindersTiming: "1 hour before"
};

// Initialize localStorage with version bump to v3 to trigger data re-seed
export const initializeDB = () => {
  if (!localStorage.getItem("beacon_initialized_v3")) {
    localStorage.setItem("beacon_users", JSON.stringify(DEFAULT_USERS));
    localStorage.setItem("beacon_leads", JSON.stringify(DEFAULT_LEADS));
    localStorage.setItem("beacon_inspections", JSON.stringify(DEFAULT_INSPECTIONS));
    localStorage.setItem("beacon_activities", JSON.stringify(DEFAULT_ACTIVITIES));
    localStorage.setItem("beacon_notifications", JSON.stringify(DEFAULT_NOTIFICATIONS));
    localStorage.setItem("beacon_settings", JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem("beacon_properties", JSON.stringify(DEFAULT_PROPERTIES));
    // Set default logged in user to Gbenga Daniel (General Manager)
    localStorage.setItem("beacon_current_user", JSON.stringify(DEFAULT_USERS[DEFAULT_USERS.length - 1]));
    localStorage.setItem("beacon_initialized_v3", "true");
  }
};

// Generic read/write helpers
const getData = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Database APIs
export const db = {
  // Users
  getUsers: () => getData("beacon_users"),
  saveUser: (user) => {
    const users = getData("beacon_users");
    if (user.id) {
      const idx = users.findIndex(u => u.id === user.id);
      users[idx] = { ...users[idx], ...user };
    } else {
      user.id = "u-" + Date.now();
      user.dateAdded = new Date().toISOString().split('T')[0];
      user.status = user.status || "Active";
      users.push(user);
    }
    setData("beacon_users", users);
    db.logAudit(`User account ${user.name} created/updated by management.`);
    return user;
  },
  deleteUser: (userId, reassignToId) => {
    const users = db.getUsers();
    const leads = db.getLeads();
    
    // Check if user has leads
    const assignedLeadsCount = leads.filter(l => l.assignedCloserId === userId && l.status === "Active").length;
    
    if (assignedLeadsCount > 0) {
      if (!reassignToId) {
        throw new Error(`This user has ${assignedLeadsCount} leads assigned. Please reassign them before deleting.`);
      }
      // Reassign leads
      const updatedLeads = leads.map(l => {
        if (l.assignedCloserId === userId) {
          return {
            ...l,
            assignedCloserId: reassignToId,
            lastActivityDate: new Date().toISOString()
          };
        }
        return l;
      });
      setData("beacon_leads", updatedLeads);
      
      // Log reassignment activities
      const newCloser = users.find(u => u.id === reassignToId)?.name || "another closer";
      leads.forEach(l => {
        if (l.assignedCloserId === userId) {
          db.saveActivity({
            leadId: l.id,
            type: "Internal Note",
            summary: `Lead reassigned to ${newCloser} due to account deletion of previous closer.`,
            objections: "None",
            feedback: "N/A",
            nextStep: l.nextAction,
            loggedBy: "System"
          });
        }
      });
    }

    const updatedUsers = users.filter(u => u.id !== userId);
    setData("beacon_users", updatedUsers);
    db.logAudit(`User account deleted. Leads reassigned to closer ${reassignToId}.`);
  },

  // Leads
  getLeads: () => getData("beacon_leads").filter(l => l.status === "Active"),
  getArchivedLeads: () => getData("beacon_leads").filter(l => l.status === "Archived"),
  saveLead: (lead) => {
    const leads = getData("beacon_leads");
    const currentLoggedUser = db.getCurrentUser();
    let isNew = false;

    if (lead.id) {
      const idx = leads.findIndex(l => l.id === lead.id);
      const prevLead = leads[idx];
      leads[idx] = { ...prevLead, ...lead, lastActivityDate: new Date().toISOString() };
      
      // Compute change details
      const changedFields = [];
      if (prevLead.assignedCloserId !== lead.assignedCloserId) {
        const users = db.getUsers();
        const oldC = users.find(u => u.id === prevLead.assignedCloserId)?.name || "Unassigned";
        const newC = users.find(u => u.id === lead.assignedCloserId)?.name || "Unassigned";
        changedFields.push(`assigned closer from '${oldC}' to '${newC}'`);
      }
      if (prevLead.stage !== lead.stage) changedFields.push(`stage from '${prevLead.stage}' to '${lead.stage}'`);
      if (prevLead.temperature !== lead.temperature) changedFields.push(`temperature from '${prevLead.temperature}' to '${lead.temperature}'`);
      
      if (changedFields.length > 0) {
        db.saveActivity({
          leadId: lead.id,
          type: "Internal Note",
          summary: `Lead details updated by ${currentLoggedUser.name} on ${new Date().toLocaleString()}: changed ${changedFields.join(", ")}.`,
          objections: "None",
          feedback: "N/A",
          nextStep: lead.nextAction || prevLead.nextAction,
          loggedBy: currentLoggedUser.name
        });
      }
    } else {
      isNew = true;
      lead.id = "l-" + Date.now();
      lead.dateCreated = new Date().toISOString();
      lead.lastActivityDate = lead.dateCreated;
      lead.status = "Active";
      lead.stage = lead.stage || "New Lead";
      leads.push(lead);

      // Create initial activity log for lead creation
      setTimeout(() => {
        db.saveActivity({
          leadId: lead.id,
          type: "Internal Note",
          summary: `Lead created by ${currentLoggedUser.name} with source: ${lead.source}.`,
          objections: "None",
          feedback: "N/A",
          nextStep: lead.nextAction || "Contact lead immediately.",
          loggedBy: currentLoggedUser.name
        });
      }, 50);
    }
    setData("beacon_leads", leads);
    return lead;
  },
  archiveLead: (leadId) => {
    const leads = getData("beacon_leads");
    const inspections = db.getInspections();
    
    // Check for active inspections
    const activeInspections = inspections.filter(i => i.leadId === leadId && (i.status === "Scheduled" || i.status === "Confirmed"));
    if (activeInspections.length > 0) {
      throw new Error(`This lead has an upcoming inspection scheduled for ${activeInspections[0].date}. Please cancel or complete the inspection before archiving.`);
    }

    const idx = leads.findIndex(l => l.id === leadId);
    if (idx !== -1) {
      leads[idx].status = "Archived";
      setData("beacon_leads", leads);
      db.saveActivity({
        leadId: leadId,
        type: "Internal Note",
        summary: `Lead was archived by ${db.getCurrentUser().name}.`,
        objections: "None",
        feedback: "N/A",
        nextStep: "N/A",
        loggedBy: db.getCurrentUser().name
      });
    }
  },
  restoreLead: (leadId) => {
    const leads = getData("beacon_leads");
    const idx = leads.findIndex(l => l.id === leadId);
    if (idx !== -1) {
      const lead = leads[idx];
      lead.status = "Active";
      
      // Check if assigned closer has been deactivated
      const users = db.getUsers();
      const assignedCloser = users.find(u => u.id === lead.assignedCloserId);
      if (!assignedCloser || assignedCloser.status === "Inactive") {
        lead.assignedCloserId = null; // Set to unassigned
        db.addNotification({
          type: "New Lead Unassigned",
          message: `Restored lead '${lead.name}' was unassigned as the previous closer is inactive.`,
          link: `/leads/${lead.id}`
        });
      }

      setData("beacon_leads", leads);
      db.saveActivity({
        leadId: leadId,
        type: "Internal Note",
        summary: `Lead restored by ${db.getCurrentUser().name}.`,
        objections: "None",
        feedback: "N/A",
        nextStep: lead.nextAction,
        loggedBy: db.getCurrentUser().name
      });
    }
  },

  // Inspections
  getInspections: () => getData("beacon_inspections"),
  saveInspection: (inspection) => {
    const inspections = getData("beacon_inspections");
    const leads = db.getLeads();
    const currentLoggedUser = db.getCurrentUser();
    let isNew = false;

    // Check if lead already has active inspections (Scheduled/Confirmed)
    if (!inspection.id) {
      const active = inspections.filter(i => i.leadId === inspection.leadId && (i.status === "Scheduled" || i.status === "Confirmed"));
      if (active.length > 0) {
        // Warning triggers, UI will handle confirmation.
      }
    }

    if (inspection.id) {
      const idx = inspections.findIndex(i => i.id === inspection.id);
      const prevIns = inspections[idx];
      inspections[idx] = { ...prevIns, ...inspection };
    } else {
      isNew = true;
      inspection.id = "i-" + Date.now();
      inspection.createdBy = currentLoggedUser.name;
      inspection.createdDate = new Date().toISOString();
      inspection.status = inspection.status || "Scheduled";
      inspections.push(inspection);
    }
    setData("beacon_inspections", inspections);

    // Update lead pipeline stage if previous stage was lower than Inspection Booked
    const lead = leads.find(l => l.id === inspection.leadId);
    if (lead) {
      if (inspection.status === 'Completed') {
        lead.stage = "Inspection Completed";
        db.saveLead(lead);
      } else {
        const stageOrder = [
          "New Lead", "Contact Attempted", "Conversation Started", "Qualified Prospect"
        ];
        if (stageOrder.includes(lead.stage)) {
          lead.stage = "Inspection Booked";
          db.saveLead(lead);
        }
      }
    }

    // Add activity log
    if (inspection.status === 'Completed') {
      db.saveActivity({
        leadId: inspection.leadId,
        type: "Site Inspection Report",
        summary: `Site Inspection Completed at ${inspection.estate} on ${inspection.date}. Report: ${inspection.report || 'No report summary logged.'}`,
        objections: "None",
        feedback: inspection.feedback || "Positive feedback received.",
        nextStep: inspection.nextStepRecommendation || "Proceed with sales closer follow-up.",
        loggedBy: currentLoggedUser.name
      });
    } else if (inspection.status === 'No-Show') {
      db.saveActivity({
        leadId: inspection.leadId,
        type: "Site Inspection No-Show",
        summary: `Site Inspection No-Show at ${inspection.estate} on ${inspection.date}. Note: ${inspection.noShowNote || 'No explanation provided.'}`,
        objections: "None",
        feedback: "Client did not attend scheduled inspection.",
        nextStep: "Reschedule or follow up via call.",
        loggedBy: currentLoggedUser.name
      });
    } else {
      db.saveActivity({
        leadId: inspection.leadId,
        type: "Internal Note",
        summary: isNew 
          ? `Inspection scheduled at ${inspection.estate} on ${inspection.date} at ${inspection.time} (assigned to officer: ${db.getUsers().find(u => u.id === inspection.inspectionOfficerId)?.name}).`
          : `Inspection details updated: Status changed to ${inspection.status}.`,
        objections: "None",
        feedback: "N/A",
        nextStep: `Attend scheduled inspection.`,
        loggedBy: currentLoggedUser.name
      });
    }

    return inspection;
  },

  // Activities
  getActivities: () => getData("beacon_activities"),
  saveActivity: (activity) => {
    const activities = getData("beacon_activities");
    activity.id = "a-" + Date.now();
    activity.date = activity.date || new Date().toISOString();
    activities.unshift(activity); // Add to top
    setData("beacon_activities", activities);

    // Update lead's last activity date
    const leads = getData("beacon_leads");
    const idx = leads.findIndex(l => l.id === activity.leadId);
    if (idx !== -1) {
      leads[idx].lastActivityDate = activity.date;
      if (activity.updateFollowUp && activity.followUpDate) {
        leads[idx].followUpDate = activity.followUpDate;
      }
      if (activity.updateStage && activity.pipelineStage) {
        const oldStage = leads[idx].stage;
        leads[idx].stage = activity.pipelineStage;
        
        // Log stage update as separate entry
        setTimeout(() => {
          db.saveActivity({
            leadId: activity.leadId,
            type: "Internal Note",
            summary: `Stage updated from '${oldStage}' to '${activity.pipelineStage}' by ${activity.loggedBy}.`,
            objections: "None",
            feedback: "N/A",
            nextStep: activity.nextStep,
            loggedBy: activity.loggedBy
          });
        }, 10);
      }
      setData("beacon_leads", leads);
    }

    return activity;
  },

  // Notifications
  getNotifications: () => {
    const staticNotifications = getData("beacon_notifications");
    const readIds = JSON.parse(localStorage.getItem("beacon_read_notifications")) || [];
    
    // Generate payment reminders dynamically
    const dynamicNotifications = [];
    const leads = getData("beacon_leads");
    const today = new Date();
    
    leads.forEach(lead => {
      if (lead.paymentPlan && lead.paymentPlan.installmentsList) {
        lead.paymentPlan.installmentsList.forEach(inst => {
          if (inst.status === 'Pending') {
            const dueDate = new Date(inst.dueDate);
            const timeDiff = dueDate - today;
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            // If due in the next 14 days, or already overdue
            if (daysDiff <= 14) {
              const id = `n-due-${lead.id}-${inst.index}`;
              const isOverdue = daysDiff < 0;
              const formattedAmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(inst.amount);
              dynamicNotifications.push({
                id: id,
                type: isOverdue ? "Payment Plan Overdue" : "Payment Plan Due",
                message: isOverdue 
                  ? `Installment #${inst.index} of ${formattedAmt} for client '${lead.name}' is OVERDUE since ${inst.dueDate}.`
                  : `Installment #${inst.index} of ${formattedAmt} for client '${lead.name}' is due on ${inst.dueDate} (in ${daysDiff} days).`,
                timestamp: new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() - 14).toISOString(),
                read: readIds.includes(id),
                link: `/leads/${lead.id}`
              });
            }
          }
        });
      }
    });
    
    const all = [...dynamicNotifications, ...staticNotifications];
    return all.map(n => ({ ...n, read: readIds.includes(n.id) || n.read }));
  },
  addNotification: (notification) => {
    const list = getData("beacon_notifications");
    notification.id = "n-" + Date.now();
    notification.timestamp = new Date().toISOString();
    notification.read = false;
    list.unshift(notification);
    setData("beacon_notifications", list);
  },
  markNotificationRead: (id) => {
    if (id.startsWith("n-due-")) {
      const readIds = JSON.parse(localStorage.getItem("beacon_read_notifications")) || [];
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem("beacon_read_notifications", JSON.stringify(readIds));
      }
    } else {
      const list = getData("beacon_notifications");
      const idx = list.findIndex(n => n.id === id);
      if (idx !== -1) {
        list[idx].read = true;
        setData("beacon_notifications", list);
      }
    }
  },
  dismissNotification: (id) => {
    if (id.startsWith("n-due-")) {
      const readIds = JSON.parse(localStorage.getItem("beacon_read_notifications")) || [];
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem("beacon_read_notifications", JSON.stringify(readIds));
      }
    } else {
      const list = getData("beacon_notifications");
      const updated = list.filter(n => n.id !== id);
      setData("beacon_notifications", updated);
    }
  },
  dismissAllNotifications: () => {
    const allReminders = db.getNotifications().filter(n => n.id.startsWith("n-due-"));
    const readIds = JSON.parse(localStorage.getItem("beacon_read_notifications")) || [];
    allReminders.forEach(r => {
      if (!readIds.includes(r.id)) readIds.push(r.id);
    });
    localStorage.setItem("beacon_read_notifications", JSON.stringify(readIds));
    setData("beacon_notifications", []);
  },
  markAllNotificationsRead: () => {
    const allReminders = db.getNotifications().filter(n => n.id.startsWith("n-due-"));
    const readIds = JSON.parse(localStorage.getItem("beacon_read_notifications")) || [];
    allReminders.forEach(r => {
      if (!readIds.includes(r.id)) readIds.push(r.id);
    });
    localStorage.setItem("beacon_read_notifications", JSON.stringify(readIds));
    const list = getData("beacon_notifications");
    const updated = list.map(n => ({ ...n, read: true }));
    setData("beacon_notifications", updated);
  },

  // Properties
  getProperties: () => getData("beacon_properties"),
  saveProperty: (property) => {
    const properties = getData("beacon_properties");
    if (property.id) {
      const idx = properties.findIndex(p => p.id === property.id);
      properties[idx] = { ...properties[idx], ...property };
    } else {
      property.id = "p-" + Date.now();
      property.amenities = property.amenities || [];
      properties.push(property);
    }
    setData("beacon_properties", properties);
    db.logAudit(`Property "${property.name}" saved/updated by administration.`);
    return property;
  },
  deleteProperty: (propertyId) => {
    const properties = getData("beacon_properties");
    const updated = properties.filter(p => p.id !== propertyId);
    setData("beacon_properties", updated);
    db.logAudit(`Property ${propertyId} deleted.`);
  },

  // Settings
  getSettings: () => getData("beacon_settings"),
  saveSettings: (settings) => {
    setData("beacon_settings", settings);
    db.logAudit(`System settings updated by management.`);
  },

  // Auth / Current Session Mock
  getCurrentUser: () => JSON.parse(localStorage.getItem("beacon_current_user")),
  setCurrentUser: (user) => {
    localStorage.setItem("beacon_current_user", JSON.stringify(user));
    db.logAudit(`User session switched to ${user.name} (${user.role}).`);
  },

  // Audit Log Loggers
  getAuditLogs: () => getData("beacon_audit_logs"),
  clearAuditLogs: () => setData("beacon_audit_logs", []),
  logAudit: (message) => {
    const logs = getData("beacon_audit_logs");
    const user = db.getCurrentUser();
    logs.unshift({
      id: "aud-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: user ? `${user.name} (${user.role})` : "System",
      action: message,
      ipAddress: "192.168.100." + Math.floor(Math.random() * 254 + 1)
    });
    setData("beacon_audit_logs", logs);
  }
};
